import { LightningElement, track } from 'lwc';
import saveText from '@salesforce/apex/TextSyncController.saveText';
import getText from '@salesforce/apex/TextSyncController.getText';

export default class RichTextInput extends LightningElement {

    @track content = '';
    @track charCount = 0;
    @track lastSaved = '';
    @track password = '';
    @track confirmPassword = '';
    @track isAuthenticated = false;
    @track isRegisterMode = false;

    maxLimit = 90000;
    isEditable = true;

    connectedCallback() {
        const isAuth = sessionStorage.getItem('isAuth');
        const pwd = sessionStorage.getItem('pwd');

        if (isAuth && pwd) {
            this.password = pwd;

            // wait for DOM, skip validation
            setTimeout(() => {
                this.handleLoad(true);
            }, 0);
        }
    }
    handlePasswordChange(event) {
        let value = event.target.value;

        value = value.replace(/\D/g, '');

        this.password = value;

        event.target.value = value; // reflect cleaned value
    }

    handleConfirmPasswordChange(event) {
        let value = event.target.value;
        value = value.replace(/\D/g, '');

        this.confirmPassword = value;
        event.target.value = value;
    }

    async handleLoad() {

        const input = this.template.querySelector('[data-id="password"]');

        const pwd = (this.password || '').trim();
        console.log('PWD::', pwd);

        if (!pwd) {
            input.setCustomValidity('Please enter password');
            input.reportValidity();
            return;
        }

        if (!/^\d{4}$/.test(pwd)) {
            input.setCustomValidity('Enter exactly 4 digits');
            input.reportValidity();
            return;
        }

        input.setCustomValidity('');
        input.reportValidity();

        this.password = pwd;

        const result = await getText({ password: pwd });

        if (result.status === 'EXISTING') {

            this.content = result.content || '';
            this.charCount = this.content.length;

            this.isAuthenticated = true;
            this.isEditable = false;

            sessionStorage.setItem('isAuth', 'true');
            sessionStorage.setItem('pwd', pwd);

        } else if (result.status === 'NEW') {
            this.isRegisterMode = true;
        }
    }

    handleRegister() {

        const inputs = this.template.querySelectorAll('lightning-input');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.reportValidity()) {
                isValid = false;
            }
        });

        if (!isValid) return;

        if (this.password !== this.confirmPassword) {

            const confirmInput = inputs[1];
            confirmInput.setCustomValidity('Passwords do not match');
            confirmInput.reportValidity();
            return;
        }

        const confirmInput = inputs[1];
        confirmInput.setCustomValidity('');
        confirmInput.reportValidity();

        this.isRegisterMode = false;
        this.isAuthenticated = true;
        this.isEditable = true;

        this.content = '';
        this.charCount = 0;

        sessionStorage.setItem('isAuth', 'true');
        sessionStorage.setItem('pwd', this.password);
    }

    handleBackToLogin() {
        this.isRegisterMode = false;
        this.password = '';
        this.confirmPassword = '';
    }

    get isDisabled() {
        return !this.isEditable;
    }

    get isOverLimit() {
        return this.charCount > this.maxLimit;
    }

    get isSaveDisabled() {
        return this.isDisabled || this.isOverLimit;
    }

    get progressPercent() {
        return Math.min((this.charCount / this.maxLimit) * 100, 100);
    }

    get progressStyle() {
        let percent = this.progressPercent;
        let color = '#16a34a';

        if (percent > 90) color = '#dc2626';
        else if (percent > 70) color = '#f59e0b';

        return `width:${percent}%; background:${color}`;
    }

    handleChange(event) {
        this.content = event.target.value || '';
        this.charCount = this.content.length;
    }

    async handleSubmit() {

        await saveText({
            content: this.content,
            password: this.password
        });

        this.isEditable = false;

        const now = new Date();
        this.lastSaved = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    handleEdit() {
        this.isEditable = true;
    }

    handleClear() {
        this.content = '';
        this.charCount = 0;
    }

    handleBack() {
        this.isAuthenticated = false;
        this.password = '';
        sessionStorage.clear();
    }

    get modeLabel() {
        return this.isEditable ? 'Edit Mode ✏️' : 'Read Only 🔒';
    }

    get statusClass() {
        return this.isEditable ? 'badge edit' : 'badge view';
    }

    handleCopy() {
        navigator.clipboard.writeText(this.content);
    }

    handleDownload() {
        const blob = new Blob([this.content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'content.txt';
        a.click();

        window.URL.revokeObjectURL(url);
    }
}