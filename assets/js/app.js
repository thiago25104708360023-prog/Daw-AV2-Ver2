document.addEventListener("DOMContentLoaded", () => {
    
    let appState = {
        isAuthenticated: false,
        user: null,
        servicesData: [], 
        cart: [],
        currentSelectedService: null
    };

    const views = {
        'inicio': document.getElementById('view-inicio'),
        'sobre': document.getElementById('view-sobre'),
        'login': document.getElementById('view-login'),
        'servicos': document.getElementById('view-servicos'),
        'carrinho': document.getElementById('view-carrinho'),
        'pagamento': document.getElementById('view-pagamento')
    };

    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = link.getAttribute('data-target');
            if (target) {
                e.preventDefault();
                switchView(target);
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });

    document.getElementById('nav-contato').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('footer-contato-section').scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('nav-logo').addEventListener('click', () => switchView('inicio'));
    document.getElementById('btn-header-login').addEventListener('click', () => switchView('login'));
    document.getElementById('btn-login-back').addEventListener('click', () => switchView('inicio'));
    
    document.getElementById('hero-action-btn').addEventListener('click', () => {
        if (appState.isAuthenticated) {
            switchView('servicos');
        } else {
            switchView('login');
        }
    });

    document.getElementById('btn-go-to-cart-view').addEventListener('click', () => switchView('carrinho'));
    document.getElementById('btn-logout').addEventListener('click', (e) => {
        e.preventDefault();
        executeLogout();
    });

    document.getElementById('btn-submit-login').addEventListener('click', executeLogin);

    document.querySelectorAll('.cat-panel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const categoryId = parseInt(btn.getAttribute('data-cat-id'));
            openServicesSelectionPopup(categoryId);
        });
    });

    document.getElementById('btn-trigger-clear-cart').addEventListener('click', () => {
        if(appState.cart.length > 0) {
            document.getElementById('modal-clear-confirm').classList.add('active');
        }
    });
    document.getElementById('btn-confirm-clear-yes').addEventListener('click', () => {
        appState.cart = [];
        updateCartPanelUI();
        document.getElementById('modal-clear-confirm').classList.remove('active');
    });
    document.getElementById('btn-confirm-clear-no').addEventListener('click', () => {
        document.getElementById('modal-clear-confirm').classList.remove('active');
    });

    document.getElementById('btn-proceed-payment').addEventListener('click', () => switchView('pagamento'));

    document.getElementById('pay-btn-pix').addEventListener('click', () => renderPaymentDetail('pix'));
    document.getElementById('pay-btn-credit').addEventListener('click', () => renderPaymentDetail('card', 'Crédito'));
    document.getElementById('pay-btn-debit').addEventListener('click', () => renderPaymentDetail('card', 'Débito'));

    checkAuthenticationStatus();
    loadServicesPayload();

    function switchView(viewKey) {
        Object.keys(views).forEach(key => views[key].classList.remove('active'));
        if (views[viewKey]) {
            views[viewKey].classList.add('active');
            window.scrollTo(0, 0);
        }
    }

    function checkAuthenticationStatus() {
        fetch('api.php?action=check-auth')
            .then(res => res.json())
            .then(data => {
                if (data.authenticated) {
                    setSessionLoggedState(data.user);
                } else {
                    setSessionUnloggedState();
                }
            });
    }

    function loadServicesPayload() {
        fetch('api.php?action=get-services')
            .then(res => res.json())
            .then(response => {
                if (response.success) {
                    appState.servicesData = response.data;
                    renderServicesMenuTab();
                }
            });
    }

    function executeLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorBox = document.getElementById('login-error-msg');
        errorBox.classList.add('hidden');

        fetch('api.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                setSessionLoggedState(data.user);
                switchView('inicio');
            } else {
                errorBox.textContent = data.error;
                errorBox.classList.remove('hidden');
            }
        });
    }

    function executeLogout() {
        fetch('api.php?action=logout')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setSessionUnloggedState();
                    switchView('inicio');
                }
            });
    }

    function setSessionLoggedState(user) {
        appState.isAuthenticated = true;
        appState.user = user;
        document.getElementById('btn-header-login').classList.add('hidden');
        document.getElementById('user-profile-icon').classList.remove('hidden');
        document.getElementById('dropdown-username').textContent = user.name;
    }

    function setSessionUnloggedState() {
        appState.isAuthenticated = false;
        appState.user = null;
        document.getElementById('btn-header-login').classList.remove('hidden');
        document.getElementById('user-profile-icon').classList.add('hidden');
    }

    function renderServicesMenuTab() {
        const display = document.getElementById('services-categories-display');
        display.innerHTML = '';
        appState.servicesData.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'category-menu-card';
            let itemsHtml = '';
            cat.services.forEach(srv => {
                itemsHtml += `
                    <div class="menu-item-row">
                        <span>${srv.name}</span>
                        <strong>R$ ${parseFloat(srv.price).toFixed(2).replace('.', ',')}</strong>
                    </div>
                `;
            });
            card.innerHTML = `<h2>${cat.name}</h2><div class="services-menu-items">${itemsHtml}</div>`;
            display.appendChild(card);
        });
    }

    // ENGENHARIA DO FLUXO DOS POPUPS SEQUENCIAIS DO CARRINHO
    function openServicesSelectionPopup(categoryId) {
        const category = appState.servicesData.find(c => c.id === categoryId);
        if (!category) return;

        document.getElementById('modal-services-title').textContent = category.name;
        const listContainer = document.getElementById('modal-services-list');
        listContainer.innerHTML = '';

        category.services.forEach(srv => {
            const btn = document.createElement('button');
            btn.className = 'sub-service-btn';
            btn.innerHTML = `<span>${srv.name}</span> <strong>R$ ${parseFloat(srv.price).toFixed(2)}</strong>`;
            btn.addEventListener('click', () => {
                appState.currentSelectedService = { id: srv.id, name: srv.name, price: srv.price };
                closeModal('modal-services');
                openCalendarPopup(); // Próximo passo
            });
            listContainer.appendChild(btn);
        });
        document.getElementById('modal-services').classList.add('active');
    }

    function openCalendarPopup() {
        document.getElementById('modal-calendar').classList.add('active');
        document.querySelectorAll('.select-day').forEach(token => {
            const newDay = token.cloneNode(true);
            token.parentNode.replaceChild(newDay, token);
            newDay.addEventListener('click', () => {
                const dayStr = newDay.getAttribute('data-day');
                appState.currentSelectedService.date = `2026-06-${dayStr}`;
                closeModal('modal-calendar');
                openHoursPopup(); // Próximo passo
            });
        });
    }

    function openHoursPopup() {
        document.getElementById('modal-hours').classList.add('active');
        document.querySelectorAll('.hour-slot-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => {
                const timeStr = newBtn.getAttribute('data-time');
                appState.currentSelectedService.time = timeStr;
                
                appState.cart.push({ ...appState.currentSelectedService });
                closeModal('modal-hours');
                updateCartPanelUI();
            });
        });
    }

    function updateCartPanelUI() {
        const scrollBox = document.getElementById('cart-items-list');
        scrollBox.innerHTML = '';

        if(appState.cart.length === 0) {
            scrollBox.innerHTML = '<p class="empty-cart-notice">Seu carrinho já está vazio</p>';
            document.getElementById('cart-total-value').textContent = 'R$ 0,00';
            document.getElementById('btn-proceed-payment').disabled = true;
            return;
        }

        let totalSum = 0;
        appState.cart.forEach((item) => {
            totalSum += parseFloat(item.price);
            const formattedDate = item.date.split('-')[2] + '/06';
            const record = document.createElement('div');
            record.className = 'cart-item-record';
            record.innerHTML = `
                <div class="title-row"><span>${item.name}</span><span>R$ ${item.price.toFixed(2).replace('.', ',')}</span></div>
                <div class="meta-row">Agendado para: ${formattedDate} às ${item.time}</div>
            `;
            scrollBox.appendChild(record);
        });

        document.getElementById('cart-total-value').textContent = `R$ ${totalSum.toFixed(2).replace('.', ',')}`;
        document.getElementById('btn-proceed-payment').disabled = false;
    }

    function renderPaymentDetail(type, subtypeLabel = '') {
        const panel = document.getElementById('payment-contextual-area');
        panel.innerHTML = '';
        panel.classList.remove('hidden');

        if (type === 'pix') {
            panel.innerHTML = `
                <div class="pix-qr-container">
                    <h3>Forma de pagamento escolhida: Pix</h3>
                    <p>Falta pouco! Pague seu Pix através do app de seu banco.</p>
                    <div class="qr-code-placeholder"></div>
                    <button class="btn-orange-filled" id="btn-finalize-booking">Confirmar Pagamento Simulado</button>
                </div>
            `;
        } else {
            panel.innerHTML = `
                <div class="card-form-container">
                    <h3>Cadastrar Cartão de ${subtypeLabel}</h3>
                    <form onsubmit="return false;" style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">
                        <div class="form-group"><label>Número do cartão</label><input type="text" placeholder="0000 0000 0000 0000"></div>
                        <div class="form-group"><label>Nome impresso</label><input type="text" placeholder="Nome Completo"></div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div class="form-group"><label>Validade</label><input type="text" placeholder="MM/AA"></div>
                            <div class="form-group"><label>CVV</label><input type="text" placeholder="000"></div>
                        </div>
                        <button class="btn-orange-filled" id="btn-finalize-booking">Finalizar Pagamento</button>
                    </form>
                </div>
            `;
        }

        document.getElementById('btn-finalize-booking').addEventListener('click', executeDatabaseBookingTransaction);
    }

    function executeDatabaseBookingTransaction() {
        let totalSum = 0;
        appState.cart.forEach(i => totalSum += i.price);

        fetch('api.php?action=save-appointment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart: appState.cart, total_price: totalSum })
        })
        .then(res => res.json())
        .then(response => {
            if (response.success) {
                alert(response.message);
                appState.cart = [];
                updateCartPanelUI();
                document.getElementById('payment-contextual-area').classList.add('hidden');
                switchView('inicio');
            } else {
                alert('Erro: ' + response.error);
            }
        });
    }

    window.closeModal = function(id) {
        document.getElementById(id).classList.remove('active');
    };
});
