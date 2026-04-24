import { LightningElement, track } from 'lwc';
import saveText from '@salesforce/apex/TextSyncController.saveText';
import getText from '@salesforce/apex/TextSyncController.getText';
import createRecord from '@salesforce/apex/TextSyncController.createRecord';
import getFiles from '@salesforce/apex/TextSyncController.getFiles';
export default class RichTextInput extends LightningElement {

    @track content = '';
    @track charCount = 0;
    @track password = '';
    @track confirmPassword = '';
    @track isAuthenticated = false;
    @track isRegisterMode = false;

    @track uploadedFiles = [];
    @track recordId;

    maxLimit = 90000;
    isEditable = true;

    // 🔥 AUTO LOGIN AFTER REFRESH
    connectedCallback() {

        const isAuth = sessionStorage.getItem('isAuth');
        const pwd = sessionStorage.getItem('pwd');

        // 🔥 ONLY AUTO LOGIN IF password is NOT manually entered
        if (isAuth && pwd && !this.password) {

            console.log('AUTO LOGIN');

            this.password = pwd;
            this.handleLoad(true);
        }
    }

    handlePasswordChange(event) {
        let value = event.target.value.replace(/\D/g, '');
        this.password = value;
        event.target.value = value;
    }

    handleConfirmPasswordChange(event) {
        let value = event.target.value.replace(/\D/g, '');
        this.confirmPassword = value;
        event.target.value = value;
    }

    async handleLoad(isAuto = false) {

        let input;

        if (!isAuto) {
            input = this.template.querySelector('[data-id="password"]');

            if (!/^\d{4}$/.test(this.password)) {
                input.setCustomValidity('Enter exactly 4 digits');
                input.reportValidity();
                return;
            }

            input.setCustomValidity('');
        }

        const result = await getText({ password: this.password });

        if (result.status === 'EXISTING') {

            this.content = result.content || '';
            this.charCount = this.content.length;
            this.recordId = result.recordId;
            await this.loadFiles();
            this.isAuthenticated = true;
            this.isEditable = false;

            // 🔥 SAVE SESSION
            sessionStorage.setItem('isAuth', 'true');
            sessionStorage.setItem('pwd', this.password);

        } else {
            console.log('NEW PASSWORD FLOW');

            this.isAuthenticated = false;
            this.isRegisterMode = true;
            this.confirmPassword = '';
        }
    }
    get statusClass() {
        return this.isEditable ? 'badge edit' : 'badge view';
    }
    async loadFiles() {

        if (!this.recordId) return;

        const files = await getFiles({ recordId: this.recordId });

        this.uploadedFiles = files.map(file => {
            return {
                name: file.name,
                documentId: file.documentId,
                downloadUrl: '/sfc/servlet.shepherd/document/download/' + file.documentId
            };
        });
    }

    async handleRegister() {

        if (!/^\d{4}$/.test(this.password)) {
            alert('Enter valid 4 digit password');
            return;
        }

        if (this.password !== this.confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        // 🔥 CREATE RECORD IMMEDIATELY
        this.recordId = await createRecord({ password: this.password });

        this.isRegisterMode = false;
        this.isAuthenticated = true;
        this.isEditable = true;

        this.content = '';
        this.charCount = 0;

        // 🔥 SAVE SESSION
        sessionStorage.setItem('isAuth', 'true');
        sessionStorage.setItem('pwd', this.password);

        // 🔥 load files (empty initially)
        await this.loadFiles();
    }

    get isDisabled() {
        return !this.isEditable;
    }

    get isSaveDisabled() {
        return this.isDisabled;
    }

    handleChange(event) {
        this.content = event.target.value || '';
        this.charCount = this.content.length;
    }

    async handleSubmit() {

        const recId = await saveText({
            content: this.content,
            password: this.password
        });
        this.recordId = recId;

        await this.loadFiles();
        this.isEditable = false;
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
        sessionStorage.clear(); // 🔥 CLEAR SESSION
    }

    get modeLabel() {
        return this.isEditable ? 'Edit Mode ✏️' : 'Read Only 🔒';
    }

    // 🔥 FILE DOWNLOAD SUPPORT
    handleUploadFinished(event) {

        let files = event.detail.files;

        if ((this.uploadedFiles.length + files.length) > 3) {
            alert('Max 3 files allowed');
            return;
        }

        files.forEach(file => {

            this.uploadedFiles.push({
                name: file.name,
                documentId: file.documentId,
                downloadUrl: '/sfc/servlet.shepherd/document/download/' + file.documentId
            });

        });
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
    }
}