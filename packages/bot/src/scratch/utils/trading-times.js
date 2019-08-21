import PendingPromise from "./pending-promise";

export default class TradingTimes {
    constructor(ws, server_time) {
        this.init_promise   = new PendingPromise();
        this.is_initialised = false;
        this.server_time    = server_time;
        this.trading_times  = {};
        this.ws             = ws;
    }

    async initialise() {
        await this.server_time.init();

        if (this.is_initialised) {
            return this.init_promise;
        }

        this.is_initialised   = true;
        this.last_update_date = this.server_time.getLocalDate().toISOString().substring(0, 10);

        if (!Object.keys(this.trading_times).length) {
            await this.updateTradingTimes();
            this.init_promise.resolve();

            const periodicUpdate = async () => {
                const changes = this.updateMarketOpenClosed();

                if (Object.keys(changes).length > 0 && this.onMarketOpenCloseChanged) {
                    this.onMarketOpenCloseChanged(changes);
                }

                let next_update = this.nextUpdateDate();

                if (!next_update) {
                    const now = this.server_time.getLocalDate();

                    // Get tomorrow's date (UTC) and set it as next update if no nextDate available
                    const next_update_date = new Date(`${this.last_update_date}T00:00:00Z`);

                    next_update_date.setDate(next_update_date.getDate() + 1);

                    // if somehow the next update date is in the past, use the current date
                    this.last_update_date = ((now > next_update_date) ? now : next_update_date).toISOString().substring(0, 10);

                    // Retain the current market open close status, because the trade times
                    // will now be the following day:
                    const is_open_map = {};

                    Object.keys(this.trading_times).forEach(symbol_name => {
                        is_open_map[symbol_name] = this.trading_times[symbol_name].is_opened;
                    });

                    await this.updateTradingTimes();

                    Object.keys(this.trading_times).forEach(symbol_name => {
                        this.trading_times[symbol_name].is_opened = is_open_map[symbol_name];
                    });

                    // next update date will be 00:00 hours (UTC) of the following day:
                    next_update = next_update_date;
                }

                const wait_period = next_update - this.server_time.getLocalDate();

                this.update_timer = setTimeout(periodicUpdate, wait_period);
            }

            await periodicUpdate();
        }

    }

    async updateTradingTimes() {
        const response  = await this.ws.getTradingTimes(this.last_update_date);

        if (response.error) {
            return;
        }

        this.trading_times = {};

        const now = this.server_time.getLocalDate();
        const date_str = now.toISOString().substring(0, 11);
        const getUTCDate = hour => new Date(`${date_str}${hour}Z`);
        const { trading_times: { markets } } = response;

        markets.forEach((market) => {
            const { submarkets } = market;

            submarkets.forEach(submarket => {
                const { symbols } = submarket;

                symbols.forEach(symbol_obj => {
                    const { times, symbol } = symbol_obj;
                    const { open, close }   = times;
                    const is_open_all_day   = open.length === 1 && open[0] === '00:00:00' && close[0] === '23:59:59';
                    const is_closed_all_day = open.length === 1 && open[0] === '--' && close[0] === '--';

                    let processed_times;
                        
                    if (!is_open_all_day && !is_closed_all_day) {
                        processed_times = open.map((open_time, index) => ({
                            open : getUTCDate(open_time),
                            close: getUTCDate(close[index]),
                        }));
                    }

                    this.trading_times[symbol] = {
                        is_open_all_day,
                        is_closed_all_day,
                        times: processed_times,
                    }
                });
            });
        });
    }

    updateMarketOpenClosed() {
        const changes = {};

        Object.keys(this.trading_times).forEach(symbol_name => {
            const is_opened  = this.calcIsMarketOpened(symbol_name);
            const symbol_obj = this.trading_times[symbol_name];

            if (symbol_obj.is_opened !== is_opened) {
                symbol_obj.is_opened = is_opened;
                changes[symbol_name] = is_opened;
            }
        });

        return changes;
    }

    calcIsMarketOpened(symbol_name) {
        const now = this.server_time.getLocalDate();
        const {
            times, 
            is_open_all_day, 
            is_closed_all_day,
        } = this.trading_times[symbol_name];

        if (is_closed_all_day) {
            return false;
        } 

        if (is_open_all_day) {
            return true;
        }

        return times.some(session => {
            const { open, close } = session;
            return now >= open && now < close;
        });
    }

    nextUpdateDate() {
        const now = this.server_time.getLocalDate();

        let nextDate;

        Object.keys(this.trading_times).forEach(symbol_name => {
            const { 
                times,
                is_open_all_day,
                is_closed_all_day,
            } = this.trading_times[symbol_name];

            if (is_open_all_day || is_closed_all_day) {
                return;
            }

            times.forEach(session => {
                const { open, close } = session;

                if (open > now && (!nextDate || open < nextDate)) {
                    nextDate = open;
                }
                if (close > now && (!nextDate || close < nextDate)) {
                    nextDate = close;
                }
            });
        });

        return nextDate;
    }

    isMarketOpened(symbol_name) {
        const symbol_names = Object.keys(this.trading_times);

        if (!symbol_names.length) {
            return;
        }

        if (!symbol_names.includes(symbol_name)) {
            return false;
        }

        return this.trading_times[symbol_name].is_opened;
    }
}