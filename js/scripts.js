// Menú completo con modificaciones
const menuItems = [
    // Platos principales
    { 
        name: "Enchiladas Verdes", 
        prepTime: 15, // 30 segundos
        ingredients: ["Tortillas", "Pollo", "Salsa verde", "Crema", "Queso"] 
    },
    { 
        name: "Pasta Alfredo", 
        prepTime: 12, // 45 segundos
        ingredients: ["Pasta", "Salsa alfredo", "Pollo", "Champiñones", "Queso parmesano"] 
    },
    { 
        name: "Hamburguesa Clásica", 
        prepTime: 20, // 25 segundos
        ingredients: ["Pan", "Carne", "Queso", "Lechuga", "Tomate"] 
    },
    { 
        name: "Ensalada César", 
        prepTime: 14, // 20 segundos
        ingredients: ["Lechuga", "Pollo", "Crutones", "Queso parmesano", "Aderezo"] 
    },
    { 
        name: "Sopa de Tortilla", 
        prepTime: 10, // 35 segundos
        ingredients: ["Caldo", "Tortillas", "Aguacate", "Queso", "Crema"] 
    },
    
  { 
        name: "Pay de Queso", 
        prepTime: 7,
        ingredients: ["Galletas", "Queso crema", "Huevos", "Leche condensada"] 
    },
    { 
        name: "Flan Napolitano", 
        prepTime: 7,
        ingredients: ["Huevos", "Leche", "Azúcar", "Vainilla", "Caramelo"] 
    },
    { 
        name: "Helado de Vainilla", 
        prepTime: 7,
        ingredients: ["Helado", "Sirope", "Fruta", "Crema batida"] 
    }
];
const modifications = [
    "",
    "SIN QUESO",
    "SIN LECHUGA",
    "SIN TOMATE",
    "SIN CEBOLLA",
    "SIN GLUTEN",
    "SIN LACTOSA"
];

// Variables globales
let orders = [];
let timers = {};
let unavailableIngredients = [];
let isPreparing = false;
let preparationQueue = [];
let orderInterval;

// Inicialización
$(document).ready(function() {
    // Configurar eventos del modal de ingredientes
    $('#reportIngredients').click(() => $('#ingredientsModal').modal('show'));
    $('#confirmIngredients').click(confirmIngredients);
    
    // Actualizar hora cada segundo
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();
    
    // Cargar ingredientes en el modal
    loadIngredientsModal();
    
    // Generar pedidos iniciales (comenzar con máximo 3 pedidos)
    generateInitialOrders();
    
    // Configurar intervalo de generación de pedidos
    startOrderGeneration();
});

// Cargar todos los ingredientes en el modal
function loadIngredientsModal() {
    const ingredientsList = new Set();
    menuItems.forEach(item => {
        item.ingredients.forEach(ing => ingredientsList.add(ing));
    });
    
    const $ingredientsList = $('#ingredientsList');
    $ingredientsList.empty();
    
    [...ingredientsList].sort().forEach(ingredient => {
        $ingredientsList.append(`
            <div class="ingredient-item">
                <input type="checkbox" class="ingredient-checkbox" id="ing-${ingredient}" value="${ingredient}">
                <label for="ing-${ingredient}">${ingredient.toUpperCase()}</label>
            </div>
        `);
    });
}

// Generar pedidos iniciales
function generateInitialOrders() {
    // Solo generar hasta 3 pedidos iniciales
    const initialCount = Math.min(3, menuItems.length);
    for (let i = 0; i < initialCount; i++) {
        addRandomOrder();
    }
}

// Iniciar generación de pedidos
function startOrderGeneration() {
    orderInterval = setInterval(() => {
        if (orders.length < 3) { // Mantener máximo 3 pedidos en pantalla
            addRandomOrder();
        }
    }, 8000);
}

// Añadir un pedido aleatorio
function addRandomOrder() {
    // Filtrar alimentos que no se pueden preparar por falta de ingredientes
    const availableItems = menuItems.filter(item => {
        return !item.ingredients.some(ing => unavailableIngredients.includes(ing));
    });
    
    if (availableItems.length === 0) {
        showNotification("NO HAY INGREDIENTES DISPONIBLES");
        return;
    }
    
    const item = availableItems[Math.floor(Math.random() * availableItems.length)];
    const mod = modifications[Math.floor(Math.random() * modifications.length)];
    const id = 'order-' + Date.now() + Math.floor(Math.random() * 1000);
    
    const newOrder = {
        id: id,
        name: item.name,
        modification: mod,
        prepTime: item.prepTime, // Tiempo en segundos
        timeRemaining: item.prepTime, // Tiempo restante en segundos
        time: new Date(),
        ingredients: item.ingredients,
        status: 'pending' // 'pending', 'preparing', 'completed'
    };
    
    // Añadir a la cola de preparación
    preparationQueue.push(newOrder);
    orders.push(newOrder);
    updateOrdersDisplay();
    updateOrdersCount();
    
    // Iniciar preparación si no hay nada en proceso
    if (!isPreparing && preparationQueue.length > 0) {
        startNextOrder();
    }
}

// Función para iniciar el siguiente pedido
function startNextOrder() {
    if (preparationQueue.length === 0) {
        isPreparing = false;
        return;
    }
    
    isPreparing = true;
    const nextOrder = preparationQueue[0]; // Tomar el primer pedido de la cola
    nextOrder.status = 'preparing';
    
    // Actualizar visualización
    updateOrdersDisplay();
    
    // Iniciar temporizador
    startOrderTimer(nextOrder);
}

// Función del temporizador mejorada
function startOrderTimer(order) {
    // Limpiar temporizador anterior si existe
    if (timers[order.id]) {
        clearInterval(timers[order.id]);
        delete timers[order.id];
    }
    
    // Formatear tiempo como MM:SS
    const formatTime = (sec) => {
        const minutes = Math.floor(sec / 60);
        const remainingSeconds = sec % 60;
return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

    };
    
    // Actualizar visualización inmediatamente
    const timerElement = $(`.prep-time-${order.id}`);

    if (timerElement.length) {
        timerElement.text(formatTime(order.timeRemaining));
    }
    
    timers[order.id] = setInterval(() => {
        order.timeRemaining--;
        
        // Actualizar el temporizador en el DOM
        const updatedTimerElement = $('.prep-time-${order.id}');
        if (updatedTimerElement.length) {
            updatedTimerElement.text(formatTime(order.timeRemaining));
            
            // Cambiar color si queda poco tiempo
            if (order.timeRemaining < 10) { // Cambiado a 10 segundos para alerta
                updatedTimerElement.parent().addClass('urgent');
            }
        }
        
        // Completar pedido cuando el tiempo termina
        if (order.timeRemaining <= 0) {
            completeOrder(order.id);
        }
    }, 1000);
    
    console.log(`Temporizador iniciado para: ${order.id}`);

}

// Función para completar pedido
function completeOrder(orderId) {
    console.log(`Completando pedido: ${orderId}`);

    
    // Detener el temporizador
    if (timers[orderId]) {
        clearInterval(timers[orderId]);
        delete timers[orderId];
    }
    
    // Eliminar el pedido completado de la cola
    preparationQueue = preparationQueue.filter(order => order.id !== orderId);
    
    // Marcar como completado en la lista principal
    const orderIndex = orders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
        orders[orderIndex].status = 'completed';
        
        // Animación de salida
        const orderElement = $(`#${orderId}`);

        if (orderElement.length) {
            orderElement.addClass('fade-out');
        }
        
        setTimeout(() => {
            // Eliminar el pedido completado de la lista principal
            orders = orders.filter(order => order.id !== orderId);
            updateOrdersDisplay();
            updateOrdersCount();
            
            // Iniciar el siguiente pedido
            startNextOrder();
            
            // Si hay menos de 3 pedidos, generar uno nuevo
            if (orders.length < 3) {
                addRandomOrder();
            }
        }, 500);
    }
}

// Función para mostrar pedidos
function updateOrdersDisplay() {
    const $ordersContainer = $('#orders-container');
    $ordersContainer.empty();
    
    if (orders.length === 0) {
        $ordersContainer.append('<div class="no-orders"><p>NO HAY PEDIDOS PENDIENTES</p></div>');
        return;
    }
    
    // Ordenar pedidos: primero los que se están preparando, luego los pendientes
    const sortedOrders = [...orders].sort((a, b) => {
        if (a.status === 'preparing') return -1;
        if (b.status === 'preparing') return 1;
        return 0;
    });
    
    // Mostrar solo los primeros 3 pedidos
    const displayOrders = sortedOrders.slice(0, 3);
    
    displayOrders.forEach((order) => {
        const isPreparingClass = order.status === 'preparing' ? 'preparing-order' : '';
        const isPendingClass = order.status === 'pending' ? 'pending-order' : '';
        
        const formatTime = (sec) => {
            const minutes = Math.floor(sec / 60);
            const remainingSeconds = sec % 60;
return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

        };
        
        const $orderElement = $(`
            <div class="order-card ${isPreparingClass} ${isPendingClass}" id="${order.id}">
                ${order.status === 'preparing' ? '<div class="preparing-label">PREPARANDO</div>' : ''}
                ${order.status === 'pending' ? '<div class="waiting-label">EN ESPERA</div>' : ''}
                <h2 class="order-title">${order.name}</h2>
${order.modification ? `<div class="order-modifications">${order.modification}</div>` : ''}

                <div class="preparation-time ${order.status === 'preparing' ? '' : 'hidden'}">
                    <i class="fas fa-clock"></i>
                    <span class="prep-time-${order.id}">
                        ${formatTime(order.timeRemaining)}
                    </span>
                </div>
            </div>
        `);
        
        $ordersContainer.append($orderElement);
    });
}

// Reportar ingredientes agotados
function confirmIngredients() {
    const selectedIngredients = [];
    $('.ingredient-checkbox:checked').each(function() {
        selectedIngredients.push($(this).val());
    });
    
    const otherIngredient = $('#otherIngredient').val().trim();
    if (otherIngredient) {
        selectedIngredients.push(otherIngredient);
    }
    
    if (selectedIngredients.length === 0) {
        showNotification("SELECCIONA AL MENOS UN INGREDIENTE");
        return;
    }
    
    // Actualizar lista de ingredientes no disponibles
    unavailableIngredients = [...new Set([...unavailableIngredients, ...selectedIngredients])];
    
    // Mostrar notificación automática
    showNotification(`INGREDIENTES AGOTADOS: ${selectedIngredients.join(', ')}`);

    
    $('#ingredientsModal').modal('hide');
    $('.ingredient-checkbox').prop('checked', false);
    $('#otherIngredient').val('');
    
    // Actualizar contador (pero no eliminar pedidos existentes)
    updateOrdersCount();
}

// Mostrar notificación flotante
function showNotification(message) {
    const $notification = $('#ingredient-notification');
    $notification.text(message).addClass('notification-fade').show();
    
    setTimeout(() => {
        $notification.removeClass('notification-fade');
        setTimeout(() => $notification.hide(), 500);
    }, 2500);
}

// Actualizar contador de pedidos
function updateOrdersCount() {
    $('.orders-count').text(orders.length);
}

// Actualizar hora actual
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