
const menuItems = [
    { name: "Enchiladas Verdes", prepTime: 15, ingredients: ["Tortillas", "Pollo", "Salsa verde", "Crema", "Queso"] },
    { name: "Pasta Alfredo", prepTime: 12, ingredients: ["Pasta", "Salsa alfredo", "Pollo", "Champiñones", "Queso parmesano"] },
    { name: "Hamburguesa Clásica", prepTime: 20, ingredients: ["Pan", "Carne", "Queso", "Lechuga", "Tomate"] },
    { name: "Ensalada César", prepTime: 14, ingredients: ["Lechuga", "Pollo", "Crutones", "Queso parmesano", "Aderezo"] },
    { name: "Sopa de Tortilla", prepTime: 10, ingredients: ["Caldo", "Tortillas", "Aguacate", "Queso", "Crema"] },
    { name: "Pay de Queso", prepTime: 7, ingredients: ["Galletas", "Queso crema", "Huevos", "Leche condensada"] },
    { name: "Flan Napolitano", prepTime: 7, ingredients: ["Huevos", "Leche", "Azúcar", "Vainilla", "Caramelo"] },
    { name: "Helado de Vainilla", prepTime: 7, ingredients: ["Helado", "Sirope", "Fruta", "Crema batida"] }
];

const modifications = ["", "SIN QUESO", "SIN LECHUGA", "SIN TOMATE", "SIN CEBOLLA", "SIN GLUTEN", "SIN LACTOSA"];

let orders = [];
let timers = {};
let unavailableDishes = [];
let isPreparing = false;
let preparationQueue = [];
let orderInterval;

$(document).ready(function() {
    setupModalEvents();
    setupTimeUpdates();
    loadDishesModal();
    generateInitialOrders();
    startOrderGeneration();
});

function setupModalEvents() {
    $('#reportDishes').click(() => $('#dishesModal').modal('show'));
    $('#confirmDishes').click(confirmDishes);
}

function setupTimeUpdates() {
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();
}

function loadDishesModal() {
    const $dishesList = $('#dishesList');
    $dishesList.empty();
    menuItems.forEach(item => {
        $dishesList.append(`
            <div class="ingredient-item">
                <input type="checkbox" class="ingredient-checkbox" id="dish-${item.name}" value="${item.name}">
                <label for="dish-${item.name}">${item.name.toUpperCase()}</label>
            </div>
        `);
    });
}

function generateInitialOrders() {
    const initialCount = Math.min(3, menuItems.length);
    for (let i = 0; i < initialCount; i++) addRandomOrder();
}

function startOrderGeneration() {
    orderInterval = setInterval(() => {
        if (orders.length < 3) addRandomOrder();
    }, 8000);
}

function addRandomOrder() {
    const availableItems = menuItems.filter(item => !unavailableDishes.includes(item.name));
    if (availableItems.length === 0) {
        showNotification("NO HAY PLATILLOS DISPONIBLES");
        return;
    }
    const item = availableItems[Math.floor(Math.random() * availableItems.length)];
    const mod = modifications[Math.floor(Math.random() * modifications.length)];
    const id = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const prepTime = item.prepTime;

    const newOrder = {
        id: id,
        name: item.name,
        modification: mod,
        prepTime: prepTime,
        timeRemaining: null,
        time: new Date(),
        ingredients: item.ingredients,
        status: 'pending'
    };

    preparationQueue.push(newOrder);
    orders.push(newOrder);
    updateOrdersDisplay();
    updateOrdersCount();

    if (!isPreparing && preparationQueue.length > 0) startNextOrder();
}

function startNextOrder() {
    if (preparationQueue.length === 0) {
        isPreparing = false;
        return;
    }
    isPreparing = true;
    const nextOrder = preparationQueue[0];
    nextOrder.status = 'preparing';
    updateOrdersDisplay();
    startOrderTimer(nextOrder);
}

function startOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    const inputValue = $(`#time-${orderId}`).val();
    const time = parseInt(inputValue);
    if (!time || time <= 0) {
        showNotification("INGRESA UN TIEMPO VÁLIDO");
        return;
    }
    order.timeRemaining = time;
    order.status = 'preparing';
    updateOrdersDisplay();
    startOrderTimer(order);
}

function startOrderTimer(order) {
    if (timers[order.id]) {
        clearInterval(timers[order.id]);
        delete timers[order.id];
    }
    const formatTime = (sec) => {
        const minutes = Math.floor(sec / 60);
        const remainingSeconds = sec % 60;
        return \`\${minutes.toString().padStart(2, '0')}:\${remainingSeconds.toString().padStart(2, '0')}\`;
    };
    timers[order.id] = setInterval(() => {
        order.timeRemaining--;
        const updatedTimerElement = $(`.prep-time-\${order.id}`);
        if (updatedTimerElement.length) {
            updatedTimerElement.text(formatTime(order.timeRemaining));
            if (order.timeRemaining < 10) updatedTimerElement.parent().addClass('urgent');
        }
        if (order.timeRemaining <= 0) completeOrder(order.id);
    }, 1000);
}

function cancelOrder(orderId) {
    const wasPreparing = orders.find(o => o.id === orderId)?.status === 'preparing';
    if (timers[orderId]) {
        clearInterval(timers[orderId]);
        delete timers[orderId];
    }
    preparationQueue = preparationQueue.filter(order => order.id !== orderId);
    orders = orders.filter(order => order.id !== orderId);
    updateOrdersDisplay();
    updateOrdersCount();
    if (wasPreparing && preparationQueue.length > 0) startNextOrder();
}

function completeOrder(orderId) {
    if (timers[orderId]) {
        clearInterval(timers[orderId]);
        delete timers[orderId];
    }
    preparationQueue = preparationQueue.filter(order => order.id !== orderId);
    const orderIndex = orders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
        const orderElement = $(`#\${orderId}`);
        if (orderElement.length) orderElement.addClass('fade-out');
        setTimeout(() => {
            orders = orders.filter(order => order.id !== orderId);
            updateOrdersDisplay();
            updateOrdersCount();
            startNextOrder();
            if (orders.length < 3) addRandomOrder();
        }, 500);
    }
}

function updateOrdersDisplay() {
    const $ordersContainer = $('#orders-container');
    $ordersContainer.empty();
    if (orders.length === 0) {
        $ordersContainer.append('<div class="no-orders"><p>NO HAY PEDIDOS PENDIENTES</p></div>');
        return;
    }
    const sortedOrders = [...orders].sort((a, b) => {
        if (a.status === 'preparing') return -1;
        if (b.status === 'preparing') return 1;
        return 0;
    });
    sortedOrders.forEach((order) => {
        const isPreparingClass = order.status === 'preparing' ? 'preparing-order' : '';
        const isPendingClass = order.status === 'pending' ? 'pending-order' : '';
        const formatTime = (sec) => {
            const minutes = Math.floor(sec / 60);
            const remainingSeconds = sec % 60;
            return \`\${minutes.toString().padStart(2, '0')}:\${remainingSeconds.toString().padStart(2, '0')}\`;
        };
        let timeDisplay = '';
        let controlsDisplay = '';
        if (order.status === 'preparing' && order.timeRemaining !== null) {
            timeDisplay = \`
                <div class="preparation-time \${order.timeRemaining < 10 ? 'urgent' : ''}">
                    <i class="fas fa-clock"></i>
                    <span class="prep-time-\${order.id}">\${formatTime(order.timeRemaining)}</span>
                </div>
            \`;
        } else if (order.status === 'pending') {
            controlsDisplay = \`
                <div class="time-controls">
                    <label>Tiempo (segundos):</label>
                    <input type="number" class="time-input" id="time-\${order.id}" placeholder="Ej: 60" min="1" max="3600">
                    <button class="btn-start" onclick="startOrder('\${order.id}')">
                        <i class="fas fa-play"></i> INICIAR
                    </button>
                </div>
            \`;
        }
        const $orderElement = $(`
            <div class="order-card \${isPreparingClass} \${isPendingClass}" id="\${order.id}">
                \${order.status === 'preparing' ? '<div class="preparing-label">PREPARANDO</div>' : ''}
                \${order.status === 'pending' ? '<div class="waiting-label">EN ESPERA</div>' : ''}
                <h2 class="order-title">\${order.name}</h2>
                \${order.modification ? \`<div class="order-modifications">\${order.modification}</div>\` : ''}
                \${timeDisplay}
                \${controlsDisplay}
                <button class="btn-cancel" onclick="cancelOrder('\${order.id}')">
                    <i class="fas fa-times"></i> CANCELAR
                </button>
            </div>
        `);
        $ordersContainer.append($orderElement);
    });
}

function confirmDishes() {
    const selectedDishes = [];
    $('.ingredient-checkbox:checked').each(function() {
        selectedDishes.push($(this).val());
    });
    if (selectedDishes.length === 0) {
        showNotification("SELECCIONA AL MENOS UN PLATILLO");
        return;
    }
    unavailableDishes = [...new Set([...unavailableDishes, ...selectedDishes])];
    showNotification(`PLATILLOS AGOTADOS: \${selectedDishes.join(', ')}`);
    const wasPreparing = orders.some(order =>
        selectedDishes.includes(order.name) && order.status === 'preparing'
    );
    orders = orders.filter(order => !selectedDishes.includes(order.name));
    preparationQueue = preparationQueue.filter(order => !selectedDishes.includes(order.name));
    updateOrdersDisplay();
    updateOrdersCount();
    if (wasPreparing && preparationQueue.length > 0) startNextOrder();
    $('#dishesModal').modal('hide');
    $('.ingredient-checkbox').prop('checked', false);
}

function showNotification(message) {
    const $notification = $('#ingredient-notification');
    $notification.text(message).addClass('notification-fade').show();
    setTimeout(() => {
        $notification.removeClass('notification-fade');
        setTimeout(() => $notification.hide(), 500);
    }, 2500);
}

function updateOrdersCount() {
    $('.orders-count').text(orders.length);
}

function updateCurrentTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    $('#current-time').text(now.toLocaleDateString('es-ES', options).toUpperCase());
}
