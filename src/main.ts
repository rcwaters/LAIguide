import './styles.css';
import 'flatpickr/dist/flatpickr.min.css';
import flatpickr from 'flatpickr';
import { initForm } from './ui/formInit';
import {
    handleGuidanceTypeChange,
    handleInvegaTypeChange,
    checkAutoSubmit,
    selectGuidanceType,
    startOver,
} from './ui/handlers';
import { MEDICATION_ID } from './ui/domIds';

initForm();

// ── Static event bindings ──────────────────────────────────────────────────────

document.getElementById(MEDICATION_ID)?.addEventListener('change', handleGuidanceTypeChange);

document.querySelector('.seg-group')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.seg-btn[data-value]');
    if (btn?.dataset.value) selectGuidanceType(btn.dataset.value);
});

// ── Delegated bindings for dynamically injected elements ──────────────────────

document.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;
    if (target.id === MEDICATION_ID) return; // handled above
    if (target instanceof HTMLInputElement && target.classList.contains('date-input')) {
        checkAutoSubmit();
        return;
    }
    if (target instanceof HTMLSelectElement) {
        if (target.dataset.handler === 'invega') {
            handleInvegaTypeChange();
        } else {
            checkAutoSubmit();
        }
    }
});

document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.btn--start-over')) startOver();
});

// ── Flatpickr initialization ───────────────────────────────────────────────────

document.querySelectorAll<HTMLInputElement>('input.date-input').forEach((input) => {
    flatpickr(input, {
        dateFormat: 'Y-m-d',
        disableMobile: true,
        allowInput: true,
        ...(input.getAttribute('min') ? { minDate: input.getAttribute('min')! } : {}),
        ...(input.getAttribute('max') ? { maxDate: input.getAttribute('max')! } : {}),
    });
});
