class Utils {
    static formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    static formatCurrency(amount) {
        if (!amount) return '0 ₽';
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(amount);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
            color: white;
            border-radius: 4px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static showModal(title, content, onConfirm = null, confirmText = 'Сохранить') {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2 style="margin: 0;">${title}</h2>
                <button class="close-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            <div id="modal-body">${content}</div>
            <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 1rem;">
                <button class="btn-secondary" id="modal-cancel">Отмена</button>
                ${onConfirm ? `<button class="btn-primary" id="modal-confirm">${confirmText}</button>` : ''}
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        modal.querySelector('.close-modal').onclick = () => modal.remove();
        modal.querySelector('#modal-cancel').onclick = () => modal.remove();
        
        if (onConfirm) {
            modal.querySelector('#modal-confirm').onclick = () => {
                onConfirm();
                modal.remove();
            };
        }

        // Закрытие по клику на фон
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        return modal;
    }

    static showLoading() {
        const loading = document.createElement('div');
        loading.id = 'loading-overlay';
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9998;
        `;
        loading.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loading);
    }

    static hideLoading() {
        const loading = document.getElementById('loading-overlay');
        if (loading) loading.remove();
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePassword(password) {
        return password.length >= 6;
    }
}

window.utils = Utils;