 // State management
 let tasks = {
    todo: [],
    'in-progress': [],
    done: []
};

// DOM Elements
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const columns = document.querySelectorAll('.column');
const taskContainers = {
    todo: document.getElementById('todoTasks'),
    'in-progress': document.getElementById('inProgressTasks'),
    done: document.getElementById('doneTasks')
};

// Initialize: Load tasks from localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem('kanbanTasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        renderTasks();
    }
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
}

// Create a task element
function createTaskElement(taskText, columnId, taskId) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task';
    taskDiv.draggable = true;
    taskDiv.dataset.taskId = taskId;
    taskDiv.dataset.columnId = columnId;

    const content = document.createElement('div');
    content.className = 'task-content';
    content.textContent = taskText;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    
    // Delete task on button click
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(taskId, columnId);
    });

    taskDiv.appendChild(content);
    taskDiv.appendChild(deleteBtn);

    return taskDiv;
}

// Render all tasks
function renderTasks() {
    // Clear all columns
    Object.values(taskContainers).forEach(container => {
        container.innerHTML = '';
    });

    // Render tasks in each column
    Object.keys(tasks).forEach(columnId => {
        const container = taskContainers[columnId];
        
        if (tasks[columnId].length === 0) {
            container.innerHTML = '<div class="empty-state">No tasks yet</div>';
        } else {
            tasks[columnId].forEach(task => {
                const taskElement = createTaskElement(task.text, columnId, task.id);
                container.appendChild(taskElement);
            });
        }
    });

    // Re-attach drag event listeners after rendering
    attachDragListeners();
}

// Add a new task
function addTask() {
    const taskText = taskInput.value.trim();
    if (!taskText) {
        alert('Please enter a task!');
        return;
    }

    const taskId = Date.now().toString();
    const newTask = {
        id: taskId,
        text: taskText
    };

    tasks.todo.push(newTask);
    taskInput.value = '';
    saveTasks();
    renderTasks();
}

// Delete a task
function deleteTask(taskId, columnId) {
    tasks[columnId] = tasks[columnId].filter(task => task.id !== taskId);
    saveTasks();
    renderTasks();
}

// Attach drag event listeners to all tasks
function attachDragListeners() {
    const taskElements = document.querySelectorAll('.task');
    
    taskElements.forEach(task => {
        // Remove existing listeners (if any) and attach new ones
        task.addEventListener('dragstart', handleDragStart);
        task.addEventListener('dragend', handleDragEnd);
    });

    // Attach drop zone listeners to columns
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });
}

// DRAGSTART EVENT HANDLER
// This function is called when the user starts dragging a task element
// The event fires once when dragging begins (when mouse button is pressed and moved)
function handleDragStart(e) {
    // Store the task ID and source column ID in the drag event's dataTransfer object
    // This data will be available in the drop event, allowing us to identify
    // which task is being moved and from which column
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
    e.dataTransfer.setData('sourceColumn', e.target.dataset.columnId);
    
    // Add a visual class to show the task is being dragged
    // This changes the appearance (makes it semi-transparent and rotated)
    e.target.classList.add('dragging');
    
    // Set the drag effect (the cursor style)
    // 'move' shows a move cursor, indicating the item will be moved
    // This tells the browser what kind of operation is happening
    e.dataTransfer.effectAllowed = 'move';
}

// DRAGOVER EVENT HANDLER
// This function is called continuously while a dragged element is over a valid drop target
// It fires many times per second (potentially 60+ times per second) while hovering over the column
// CRITICAL: We must call preventDefault() to allow dropping
function handleDragOver(e) {
    // preventDefault() is essential - without it, the drop event won't fire
    // By default, most HTML elements don't accept drops (for security reasons)
    // We need to prevent the default behavior to make this column a valid drop zone
    // Without this line, you cannot drop the task here!
    e.preventDefault();
    
    // Set the drop effect to 'move' to match our drag effect
    // This ensures the cursor shows the correct icon (move cursor) while hovering
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual feedback by highlighting the column
    // This gives the user immediate feedback that they can drop here
    // The 'drag-over' class changes the background color and slightly scales the column
    e.currentTarget.classList.add('drag-over');
}

// DROP EVENT HANDLER
// This function is called when the user releases the mouse button over a drop zone
// This is where we actually move the task to the new column - the core logic happens here!
function handleDrop(e) {
    // preventDefault() stops the browser's default drop behavior
    // (like trying to open a dropped file or navigate to a URL)
    // We want our custom drop behavior, not the browser's default
    e.preventDefault();
    
    // Remove the visual highlight since the drop is complete
    e.currentTarget.classList.remove('drag-over');
    
    // Retrieve the data we stored in the dragstart event
    // This tells us which task is being moved (taskId) and from which column (sourceColumnId)
    const taskId = e.dataTransfer.getData('text/plain');
    const sourceColumnId = e.dataTransfer.getData('sourceColumn');
    
    // Get the target column ID from the column's data attribute
    const targetColumnId = e.currentTarget.dataset.column;
    
    // Only move if the task is being dropped in a different column
    // (no need to do anything if dropped in the same column)
    if (sourceColumnId !== targetColumnId) {
        // Find the task in the source column's array
        const taskIndex = tasks[sourceColumnId].findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1) {
            // Remove the task from the source column using splice
            // splice returns an array of removed items, so we take the first (and only) one
            const task = tasks[sourceColumnId].splice(taskIndex, 1)[0];
            
            // Add the task to the target column's array
            tasks[targetColumnId].push(task);
            
            // Save to localStorage so the change persists after page refresh
            saveTasks();
            
            // Re-render all tasks to reflect the change in the UI
            renderTasks();
        }
    }
}

// DRAGLEAVE EVENT HANDLER
// Called when the dragged element leaves a drop zone
function handleDragLeave(e) {
    // Remove the highlight when the drag leaves the column
    // We check if we're actually leaving the column (not just moving to a child element)
    // relatedTarget is the element the drag is now over
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

// DRAGEND EVENT HANDLER
// Called when the drag operation ends (whether successful or not)
function handleDragEnd(e) {
    // Remove the dragging class from all tasks (in case it wasn't removed)
    // This cleans up any visual states
    e.target.classList.remove('dragging');
    
    // Remove drag-over class from all columns (cleanup)
    // This ensures no columns remain highlighted if the drag was cancelled
    columns.forEach(column => {
        column.classList.remove('drag-over');
    });
}

// Event Listeners
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Initialize the board by loading saved tasks
loadTasks();