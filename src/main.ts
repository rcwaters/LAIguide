import './styles/index.css';
import 'flatpickr/dist/flatpickr.min.css';
import flatpickr from 'flatpickr';
import { initForm } from './ui/formInit';
import {
    handleGuidanceTypeChange,
    handleSubGroupSelectorChange,
    checkAutoSubmit,
    selectGuidanceType,
    startOver,
} from './ui/handlers';
import { MEDICATION_ID } from './ui/domIds';

initForm();

document.querySelector('.seg-group')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.seg-btn[data-value]');
    if (btn?.dataset.value) selectGuidanceType(btn.dataset.value);
});

document.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;
    if (target.id === MEDICATION_ID) {
        handleGuidanceTypeChange();
        return;
    }
    if (target instanceof HTMLInputElement && target.classList.contains('date-input')) {
        checkAutoSubmit();
        return;
    }
    if (target instanceof HTMLSelectElement) {
        if (target.dataset.handler === 'subgroup') {
            handleSubGroupSelectorChange();
        } else {
            checkAutoSubmit();
        }
    }
});

document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.btn--start-over')) startOver();
});

document.querySelectorAll<HTMLInputElement>('input.date-input').forEach((input) => {
    flatpickr(input, {
        dateFormat: 'Y-m-d',
        disableMobile: true,
        allowInput: true,
        static: true,
        ...(input.getAttribute('min') ? { minDate: input.getAttribute('min')! } : {}),
        ...(input.getAttribute('max') ? { maxDate: input.getAttribute('max')! } : {}),
    });
});
