/**
 * PiaMask.js - Versiyon 4.1
 * Sade, Güçlü ve Sıfır Bağımlılık İçeren Form Doğrulama ve Maskeleme Aracı
 * Özellikler: Otomatik form validasyonu, karakter sayacı, akıllı para, tarih ve telefon maskeleme.
 */

class PiaMask {
    constructor(element, options = {}) {
        this.el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!this.el) return;

        const dataOptions = {
            mask: this.el.getAttribute('data-pia-mask'),
            min: this.el.getAttribute('data-pia-min') || this.el.getAttribute('minlength'),
            max: this.el.getAttribute('data-pia-max') || this.el.getAttribute('maxlength'),
            counter: this.el.getAttribute('data-pia-counter') === 'true',
            required: this.el.getAttribute('data-pia-required') === 'true' || this.el.hasAttribute('required'),
            msgRequired: this.el.getAttribute('data-pia-msg-required') || 'Bu alan zorunludur.',
            msgInvalid: this.el.getAttribute('data-pia-msg-invalid') || 'Geçersiz değer.'
        };

        this.options = { ...dataOptions, ...options };
        this.type = this.el.type;
        this.counterEl = null;
        
        this.init();
    }

    init() {
        // Eğer maske varsa klavye tipini belirle
        if (this.options.mask) this.setInputMode();

        // Eğer maske yoksa ve maksimum sınır belirlenmişse, HTML5 maxLength özelliğini atayarak fazla yazımı engelle
        if (!this.options.mask && this.options.max) {
            this.el.setAttribute('maxlength', this.options.max);
        }

        // Bootstrap Invalid Feedback Elementini Oluştur
        this.feedbackEl = document.createElement('div');
        this.feedbackEl.className = 'invalid-feedback fw-bold';
        
        if (this.el.parentNode.classList.contains('input-group')) {
            this.el.parentNode.parentNode.insertBefore(this.feedbackEl, this.el.parentNode.nextSibling);
        } else {
            this.el.parentNode.insertBefore(this.feedbackEl, this.el.nextSibling);
        }

        // Karakter Sayacı (Counter) Kurulumu
        if (this.options.counter && this.options.max) {
            this.setupCounter();
        }

        // Olay Dinleyicileri
        if (this.options.mask) {
            this.el.addEventListener('input', (e) => this.handleMaskInput(e));
            this.el.addEventListener('keydown', (e) => this.handleKeydown(e));
            this.el.addEventListener('paste', () => setTimeout(() => this.el.dispatchEvent(new Event('input')), 0));
            if (this.el.value) this.el.value = this.format(this.el.value);
        } else {
            this.el.addEventListener('input', () => {
                this.el.classList.remove('is-invalid', 'is-valid');
                if (this.counterEl) this.updateCounter();
            });
        }

        this.el.addEventListener('blur', () => this.validate());
    }

    setupCounter() {
        this.counterEl = document.createElement('span');
        this.counterEl.className = 'pia-counter-badge';
        
        if (this.el.parentNode.classList.contains('input-group')) {
            this.el.parentNode.appendChild(this.counterEl);
        } else {
            const wrapper = document.createElement('div');
            wrapper.className = 'position-relative w-100';
            this.el.parentNode.insertBefore(wrapper, this.el);
            wrapper.appendChild(this.el);
            wrapper.appendChild(this.counterEl);
        }
        
        this.updateCounter();
    }

    updateCounter() {
        if (!this.counterEl) return;
        let val = this.el.value || '';
        let countLen = this.options.mask ? this.getCleanCharCount(val) : val.length;
        this.counterEl.innerHTML = `${countLen}/${this.options.max}`;
    }

    setInputMode() {
        const mask = this.options.mask;
        if (['numeric', 'tckn', 'vkn', 'phone', 'date', 'credit-card'].includes(mask)) this.el.setAttribute('inputmode', 'numeric');
        else if (mask === 'currency') this.el.setAttribute('inputmode', 'decimal');
    }

    handleKeydown(e) {
        if (this.options.mask === 'currency' && (e.key === '.' || e.code === 'NumpadDecimal')) {
            e.preventDefault();
            let start = this.el.selectionStart;
            let end = this.el.selectionEnd;
            let val = this.el.value;
            this.el.value = val.substring(0, start) + ',' + val.substring(end);
            this.el.setSelectionRange(start + 1, start + 1);
            this.el.dispatchEvent(new Event('input'));
        }
    }

    handleMaskInput(e) {
        this.el.classList.remove('is-invalid', 'is-valid');
        let start = this.el.selectionStart;
        let originalValue = this.el.value;
        let rawBeforeCursor = originalValue.substring(0, start);
        let charsBeforeCursor = this.getCleanCharCount(rawBeforeCursor);

        let formattedValue = this.format(originalValue);
        this.el.value = formattedValue;

        let newCursorPos = this.calculateCursorPosition(formattedValue, charsBeforeCursor);
        this.el.setSelectionRange(newCursorPos, newCursorPos);

        if (this.counterEl) this.updateCounter();
    }

    validate() {
        let val = this.el.value;
        let isValid = true;
        let errorMsg = '';
        
        let isReq = this.options.required;
        let min = parseInt(this.options.min);
        let max = parseInt(this.options.max);

        if (isReq && (!val || val.trim() === '')) {
            isValid = false;
            errorMsg = this.options.msgRequired;
        } else if (val && val.trim() !== '') {
            let countLen = this.options.mask ? this.getCleanCharCount(val) : val.length;

            // Min Max Length Validasyonu
            if (min && countLen < min && !['date', 'datetime-local'].includes(this.type)) {
                isValid = false; errorMsg = this.options.msgInvalid !== 'Geçersiz değer.' ? this.options.msgInvalid : `En az ${min} karakter girmelisiniz.`;
            } else if (max && countLen > max && !['date', 'datetime-local'].includes(this.type)) {
                isValid = false; errorMsg = this.options.msgInvalid !== 'Geçersiz değer.' ? this.options.msgInvalid : `En fazla ${max} karakter girebilirsiniz.`;
            } 
            
            // Native HTML Tipleri Validasyonu (Email, Datetime-local min/max kontrolü)
            else if (this.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(val)) { isValid = false; errorMsg = this.options.msgInvalid !== 'Geçersiz değer.' ? this.options.msgInvalid : 'Geçerli bir e-posta adresi giriniz.'; }
            } else if (this.type === 'datetime-local' || this.type === 'date') {
                let dVal = new Date(val);
                let attrMin = this.el.getAttribute('min');
                let attrMax = this.el.getAttribute('max');
                
                if (attrMin && new Date(attrMin) > dVal) {
                    isValid = false; errorMsg = this.options.msgInvalid !== 'Geçersiz değer.' ? this.options.msgInvalid : `Tarih ${attrMin} sonrasında olmalıdır.`;
                } else if (attrMax && new Date(attrMax) < dVal) {
                    isValid = false; errorMsg = this.options.msgInvalid !== 'Geçersiz değer.' ? this.options.msgInvalid : `Tarih ${attrMax} öncesinde olmalıdır.`;
                }
            } 
            
            // Özel Maske Validasyonları
            else if (this.options.mask) {
                if (this.options.mask === 'tckn' && countLen !== 11) { isValid = false; errorMsg = this.options.msgInvalid; } 
                else if (this.options.mask === 'vkn' && countLen !== 10) { isValid = false; errorMsg = this.options.msgInvalid; } 
                else if (this.options.mask === 'phone' && countLen !== 10) { isValid = false; errorMsg = this.options.msgInvalid; } 
                else if (this.options.mask === 'date' && countLen !== 8) { isValid = false; errorMsg = this.options.msgInvalid; } 
                else if (this.options.mask === 'iban' && countLen < 24) { isValid = false; errorMsg = this.options.msgInvalid; }
            }
        }

        if ((!val || val.trim() === '') && !isReq) {
            this.el.classList.remove('is-invalid', 'is-valid');
        } else if (!isValid) {
            this.el.classList.add('is-invalid');
            this.el.classList.remove('is-valid');
            this.feedbackEl.innerHTML = errorMsg;
        } else {
            this.el.classList.remove('is-invalid');
            this.el.classList.add('is-valid');
        }

        return isValid;
    }

    getCleanCharCount(str) {
        if (this.options.mask === 'currency') return str.replace(/[^\d,]/g, '').length;
        if (this.options.mask === 'iban') return str.replace(/[^A-Za-z0-9]/g, '').length;
        return str.replace(/\D/g, '').length;
    }

    calculateCursorPosition(formattedStr, targetCleanCount) {
        let cleanCount = 0;
        for (let i = 0; i < formattedStr.length; i++) {
            let char = formattedStr[i];
            let isCleanChar = false;

            if (this.options.mask === 'currency') isCleanChar = /[\d,]/.test(char);
            else if (this.options.mask === 'iban') isCleanChar = /[A-Za-z0-9]/.test(char);
            else isCleanChar = /\d/.test(char);

            if (isCleanChar) cleanCount++;
            if (cleanCount === targetCleanCount) return i + 1;
        }
        return formattedStr.length;
    }

    format(value) {
        switch (this.options.mask) {
            case 'tckn': return this.formatNumericLength(value, 11);
            case 'vkn': return this.formatNumericLength(value, 10);
            case 'numeric': return this.formatNumericLength(value, this.options.max || 999);
            case 'phone': return this.formatPhone(value);
            case 'date': return this.formatDate(value);
            case 'currency': return this.formatCurrency(value);
            case 'iban': return this.formatIBAN(value);
            case 'credit-card': return this.formatCreditCard(value);
            default: return value;
        }
    }

    formatNumericLength(val, length) { return val.replace(/\D/g, '').substring(0, length); }
    formatPhone(val) {
        let clean = val.replace(/\D/g, '');
        if (clean.startsWith('0')) clean = clean.substring(1);
        if (clean.length > 10) clean = clean.substring(0, 10);
        let res = '';
        if (clean.length > 0) res += '(' + clean.substring(0, 3);
        if (clean.length >= 4) res += ') ' + clean.substring(3, 6);
        if (clean.length >= 7) res += ' ' + clean.substring(6, 8);
        if (clean.length >= 9) res += ' ' + clean.substring(8, 10);
        return res;
    }
    formatDate(val) {
        let clean = val.replace(/\D/g, '').substring(0, 8);
        let day = clean.substring(0, 2), month = clean.substring(2, 4), year = clean.substring(4, 8);
        if (day.length === 2 && parseInt(day) > 31) day = '31';
        if (day.length === 2 && parseInt(day) === 0) day = '01';
        if (month.length === 2 && parseInt(month) > 12) month = '12';
        if (month.length === 2 && parseInt(month) === 0) month = '01';
        let res = '';
        if (day) res += day; if (month) res += '/' + month; if (year) res += '/' + year;
        return res;
    }
    formatCurrency(val) {
        let clean = val.replace(/\./g, '').replace(/[^\d,]/g, '');
        let firstCommaIndex = clean.indexOf(',');
        if (firstCommaIndex !== -1) clean = clean.substring(0, firstCommaIndex) + ',' + clean.substring(firstCommaIndex + 1).replace(/,/g, '');
        if (!clean) return '';
        let parts = clean.split(',');
        let integerPart = parts[0], decimalPart = parts.length > 1 ? ',' + parts[1].substring(0, 2) : '';
        if (integerPart.length > 1 && integerPart.startsWith('0')) integerPart = parseInt(integerPart, 10).toString();
        return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + decimalPart;
    }
    formatIBAN(val) {
        let clean = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (clean.length > 0 && !clean.startsWith('TR')) {
            if (clean.startsWith('T') && clean.length === 1) { } else { clean = 'TR' + clean.replace(/^TR/i, ''); }
        }
        if (clean.length > 26) clean = clean.substring(0, 26);
        let parts = clean.match(/.{1,4}/g); return parts ? parts.join(' ') : '';
    }
    formatCreditCard(val) {
        let clean = val.replace(/\D/g, '').substring(0, 16);
        let parts = clean.match(/.{1,4}/g); return parts ? parts.join(' ') : '';
    }
}

// --- GLOBAL BAŞLATICI & FORM SUBMIT YAKALAYICI ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Yalnızca ilgili özellikleri taşıyan inputları hedef al
    const targetInputs = document.querySelectorAll(
        '[data-pia-mask], [data-pia-required="true"], [data-pia-counter="true"], input[type="email"], input[type="password"]'
    );
    
    const piaInstances = [];
    
    targetInputs.forEach(input => {
        // Çift başlatmayı önlemek için class kontrolü
        if (!input.classList.contains('pia-initialized')) {
            piaInstances.push(new PiaMask(input));
            input.classList.add('pia-initialized');
        }
    });

    // Sayfadaki tüm formlar için gönderim (submit) yakalayıcı
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            let isFormValid = true;
            let firstInvalidEl = null;

            piaInstances.forEach(instance => {
                if (instance.el.form === form) {
                    let isValid = instance.validate();
                    if (!isValid) {
                        isFormValid = false;
                        if (!firstInvalidEl) firstInvalidEl = instance.el;
                    }
                }
            });

            if (!isFormValid) {
                e.preventDefault(); // Hata varsa formun gitmesini engelle
                e.stopPropagation();
                
                // İlk hatalı elemana kaydır (scroll) ve odaklan
                if (firstInvalidEl) {
                    firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstInvalidEl.focus({ preventScroll: true });
                }
            }
        });
    });
});
