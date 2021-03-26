import React from 'react';
import classNames from 'classnames';
import { localize } from '@deriv/translations';
import { FormSubmitErrorMessage, Button } from '@deriv/components';
import { isMobile } from '@deriv/shared';

const PasswordsFooter = ({
    errors,
    is_btn_loading,
    is_submit_success,
    isSubmitting,
    onClickSendEmail,
    status,
    values,
}) => (
    <div className='account__passwords-footer'>
        {status?.msg && (
            <FormSubmitErrorMessage
                className={classNames({ 'account-form__error-message': isMobile() })}
                message={status.msg}
            />
        )}
        <Button
            className={classNames('account__passwords-footer-btn')}
            type='button'
            onClick={onClickSendEmail}
            text={localize('Forgot password')}
            tertiary
            large
        />
        <Button
            className='account__passwords-footer-btn'
            type='submit'
            is_disabled={
                isSubmitting ||
                !!(errors.new_password || !values.new_password || errors.old_password || !values.old_password)
            }
            is_loading={is_btn_loading}
            is_submit_success={is_submit_success}
            has_effect
            text={localize('Change password')}
            primary
            large
        />
    </div>
);

export default PasswordsFooter;