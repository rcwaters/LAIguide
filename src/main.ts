import './styles.css';
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
