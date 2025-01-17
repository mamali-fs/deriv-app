import React from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { routes } from '@deriv/shared';
import { Icon, Checklist, Text } from '@deriv/components';
import { localize, Localize } from '@deriv/translations';
import { connect } from 'Stores/connect';
import CashierLocked from './cashier-locked.jsx';

const WithdrawalLocked = ({ account_status, is_10K_limit, is_ask_financial_risk_approval }) => {
    const { document, identity, needs_verification } = account_status.authentication;
    const is_poi_needed = is_10K_limit && identity.status !== 'verified';
    const has_poi_submitted = identity.status !== 'none';
    const is_poa_needed = is_10K_limit && (needs_verification.includes('document') || document?.status !== 'verified');
    const has_poa_submitted = document?.status !== 'none';
    const is_ask_financial_risk_approval_needed = is_10K_limit && is_ask_financial_risk_approval;
    const history = useHistory();
    const items = [
        ...(is_poi_needed
            ? [
                  {
                      content: has_poi_submitted
                          ? localize('Check proof of identity document verification status')
                          : localize('Upload a proof of identity to verify your identity'),
                      status: 'action',
                      onClick: () => history.push(routes.proof_of_identity),
                  },
              ]
            : []),
        ...(is_poa_needed
            ? [
                  {
                      content: has_poa_submitted
                          ? localize('Check proof of address document verification status')
                          : localize('Upload a proof of address to verify your address'),
                      status: 'action',
                      onClick: () => history.push(routes.proof_of_address),
                  },
              ]
            : []),
        ...(is_ask_financial_risk_approval_needed
            ? [
                  {
                      content: localize('Complete the financial assessment form'),
                      status: 'action',
                      onClick: () => history.push(routes.financial_assessment),
                  },
              ]
            : []),
    ];
    return (
        <React.Fragment>
            {items.length ? (
                <div className='cashier-locked'>
                    <Icon icon='IcCashierWithdrawalLock' className='cashier-locked__icon' />
                    <Text as='h2' weight='bold' align='center' className='cashier-locked__title'>
                        <Localize
                            i18n_default_text='You have reached the withdrawal limit.<0/>Please upload your proof of identity and address to lift the limit to continue your withdrawal.'
                            components={[<br key={0} />]}
                        />
                    </Text>
                    <React.Fragment>
                        <Checklist className='cashier-locked__checklist' items={items} />
                    </React.Fragment>
                </div>
            ) : (
                <CashierLocked />
            )}
        </React.Fragment>
    );
};

WithdrawalLocked.propTypes = {
    account_status: PropTypes.object,
    is_10K_limit: PropTypes.bool,
    is_ask_financial_risk_approval: PropTypes.bool,
};

export default connect(({ modules, client }) => ({
    account_status: client.account_status,
    is_10K_limit: modules.cashier.is_10k_withdrawal_limit_reached,
    is_ask_financial_risk_approval: modules.cashier.config.withdraw.error.is_ask_financial_risk_approval,
}))(WithdrawalLocked);
