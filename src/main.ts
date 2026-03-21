import './styles.css';
import 'flatpickr/dist/flatpickr.min.css';
import flatpickr from 'flatpickr';
import { initForm } from './ui/formInit';
import {
    handleGuidanceTypeChange,
    handleInvegaTypeChange,
    handleSubmit,
    checkAutoSubmit,
    selectGuidanceType,
    startOver,
} from './ui/handlers';

export {
    handleGuidanceTypeChange,
    handleInvegaTypeChange,
    handleSubmit,
    checkAutoSubmit,
    selectGuidanceType,
    startOver,
    initForm,
};

initForm();

document.querySelectorAll<HTMLInputElement>('input.date-input').forEach((input) => {
    flatpickr(input, {
        dateFormat: 'Y-m-d',
        disableMobile: true,
        allowInput: true,
        ...(input.getAttribute('min') ? { minDate: input.getAttribute('min')! } : {}),
        ...(input.getAttribute('max') ? { maxDate: input.getAttribute('max')! } : {}),
    });
});

declare global {
    interface Window {
        handleGuidanceTypeChange: typeof handleGuidanceTypeChange;
        handleInvegaTypeChange: typeof handleInvegaTypeChange;
        handleSubmit: typeof handleSubmit;
        checkAutoSubmit: typeof checkAutoSubmit;
        startOver: typeof startOver;
        selectGuidanceType: typeof selectGuidanceType;
    }
}

window.handleGuidanceTypeChange = handleGuidanceTypeChange;
window.handleInvegaTypeChange = handleInvegaTypeChange;
window.handleSubmit = handleSubmit;
window.checkAutoSubmit = checkAutoSubmit;
window.startOver = startOver;
window.selectGuidanceType = selectGuidanceType;
