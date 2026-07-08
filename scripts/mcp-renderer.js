// State management
let currentServers = [];
let currentTools = [];
let selectedServer = null;
let selectedTool = null;

// DOM Elements
const elements = {
    copilotLoadingOverlay: document.getElementById('copilotLoadingOverlay'),
    serversCopilotContainer: document.getElementById('serversCopilotContainer'),
    serverList: document.getElementById('serverList'),
    serverError: document.getElementById('serverError'),
    toolsSection: document.getElementById('toolsSection'),
    toolsDropdown: document.getElementById('toolsDropdown'),
    toolsError: document.getElementById('toolsError'),
    parametersSection: document.getElementById('parametersSection'),
    parametersForm: document.getElementById('parametersForm'),
    parametersContainer: document.getElementById('parametersContainer'),
    selectedToolName: document.getElementById('selectedToolName'),
    selectedToolDesc: document.getElementById('selectedToolDesc'),
    resultsSection: document.getElementById('resultsSection'),
    resultsContainer: document.getElementById('resultsContainer'),
    statusBar: document.getElementById('statusBar'),
    statusText: document.getElementById('statusText'),
    statusSubtext: document.getElementById('statusSubtext')
};

// Utility Functions
function showLoading(message = 'Loading...') {
    elements.copilotLoadingOverlay.classList.add('show');
}

function hideLoading() {
    elements.copilotLoadingOverlay.classList.remove('show');
}

function showError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function updateStatus(statusTextValue, statusSubtextValue = null, isConnected = false) {
    if (isConnected) {
        // Show status with green indicator to the left of service name
        elements.statusText.innerHTML = statusTextValue;
        elements.statusSubtext.style.display = 'block';
        elements.statusSubtext.innerHTML = `<span class="status-indicator"></span><span>${statusSubtextValue || ''}</span>`;
    } else {
        // Show disconnected state with custom message or defaults
        elements.statusText.textContent = statusTextValue || 'Ready to connect';
        elements.statusSubtext.textContent = statusSubtextValue || 'Please select an MCP server';
        elements.statusSubtext.style.display = 'block';
    }
}

// Theme Management
async function applyThemeToNewElements() {
    const { baseLayerLuminance, StandardLuminance } = await import('https://unpkg.com/@fluentui/web-components@2.6.1');
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const controls = document.querySelectorAll('fluent-button, fluent-select, fluent-option, fluent-text-field');
    
    controls.forEach(control => {
        baseLayerLuminance.setValueFor(control, isDark ? StandardLuminance.DarkMode : StandardLuminance.LightMode);
    });
}

// Server Management
async function fetchServers() {
    showLoading('Fetching servers...');
    elements.serverError.classList.remove('show');
    
    try {
        const response = await window.parent.mcpAPI.fetchServers();
        
        if (!response.success) {
            throw new Error(response.error);
        }
        
        currentServers = response.servers;
        displayServers(response.servers);
        
    } catch (error) {
        console.error('Error fetching servers:', error);
        showError(elements.serverError, `Failed to fetch servers: ${error.message}`);
        // Hide the status header/subheader and experimental warning when there's an error
        elements.statusText.style.display = 'none';
        elements.statusSubtext.style.display = 'none';
        const experimentalWarning = document.querySelector('.experimental-warning');
        if (experimentalWarning) {
            experimentalWarning.style.display = 'none';
        }
    } finally {
        hideLoading();
    }
}

async function displayServers(servers) {
    elements.serverList.innerHTML = '';
    
    if (servers.length === 0) {
        updateStatus('No MCP Servers Available', 'Please install an MCP server on your machine to use this sample', false);
        elements.serverList.innerHTML = '';
        return;
    }
    
    servers.forEach((server, index) => {
        const serverItem = document.createElement('div');
        serverItem.className = 'mcp-server-item';
        serverItem.innerHTML = `
            <div class="mcp-server-info">
                <div class="mcp-server-name">${server.name || '(no name)'}</div>
                <div class="mcp-server-id">ID: ${server.packages?.[0]?.identifier || 'N/A'}</div>
            </div>
            <div class="mcp-server-actions">
                <fluent-button class="mcp-server-action-btn" appearance="accent">Connect</fluent-button>
            </div>
        `;
        
        // Action button click
        const actionBtn = serverItem.querySelector('.mcp-server-action-btn');
        actionBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (selectedServer === server) {
                // If already connected to this server, disconnect
                await disconnectServer();
            } else {
                // Otherwise connect to this server
                await selectServerItem(server, serverItem);
            }
        });
        
        elements.serverList.appendChild(serverItem);
    });
    
    // Apply theme to newly created buttons
    await applyThemeToNewElements();
}

async function selectServerItem(server, element) {
    // Visual selection
    document.querySelectorAll('.mcp-server-item').forEach(el => {
        el.classList.remove('selected');
        const btn = el.querySelector('.mcp-server-action-btn');
        if (btn) btn.textContent = 'Connect';
    });
    element.classList.add('selected');
    
    selectedServer = server;
    
    // Connect to server
    showLoading('Connecting to server...');
    
    try {
        const response = await window.parent.mcpAPI.connectToServer(server);
        
        if (!response.success) {
            throw new Error(response.error);
        }
        
        // Update button label only after successful connection
        const actionBtn = element.querySelector('.mcp-server-action-btn');
        if (actionBtn) actionBtn.textContent = 'Disconnect';
        
        const serverName = server.packages?.[0]?.identifier || 'Unknown Server';
        updateStatus('Connected', serverName, true);
        
        // Fetch tools
        await fetchTools();
        
    } catch (error) {
        console.error('Connection error:', error);
        showError(elements.serverError, `Failed to connect: ${error.message}`);
        updateStatus('Connection failed', false);
        // Ensure process is terminated on connection failure
        await window.parent.mcpAPI.disconnect().catch(() => {});
        selectedServer = null;
        // Reset UI on failure
        element.classList.remove('selected');
        const actionBtn = element.querySelector('.mcp-server-action-btn');
        if (actionBtn) actionBtn.textContent = 'Connect';
    } finally {
        hideLoading();
    }
}

// Tools Management
async function fetchTools() {
    showLoading('Fetching tools...');
    elements.toolsError.classList.remove('show');
    
    try {
        const response = await window.parent.mcpAPI.listTools();
        
        if (!response.success) {
            throw new Error(response.error);
        }
        
        currentTools = response.tools;
        displayTools(response.tools);
        elements.toolsSection.style.display = 'block';
        
    } catch (error) {
        console.error('Error fetching tools:', error);
        showError(elements.toolsError, `Failed to fetch tools: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function displayTools(tools) {
    elements.toolsDropdown.innerHTML = '';
    tools.forEach(tool => {
        const option = document.createElement('fluent-option');
        option.value = tool.name;
        option.textContent = tool.name;
        option.dataset.toolData = JSON.stringify(tool);
        elements.toolsDropdown.appendChild(option);
    });
    if (tools.length > 0) selectTool(tools[0]);
}

function selectTool(tool) {
    selectedTool = tool;
    elements.resultsContainer.innerHTML = '';
    elements.resultsSection.classList.add('mcp-section-hidden');
    elements.selectedToolName.textContent = tool.name;
    elements.selectedToolDesc.textContent = tool.description || 'No description available';
    buildParameterForm(tool.inputSchema);
    elements.parametersSection.classList.remove('mcp-section-hidden');
    elements.parametersSection.scrollIntoView({ behavior: 'smooth' });
}

async function buildParameterForm(schema) {
    elements.parametersContainer.innerHTML = '';
    
    if (!schema || !schema.properties) {
        elements.parametersContainer.innerHTML = '<p style="color: var(--color-neutral-foreground-3);">This tool requires no parameters.</p>';
        return;
    }
    
    const properties = schema.properties;
    const required = schema.required || [];
    
    for (const [paramName, paramSchema] of Object.entries(properties)) {
        const isRequired = required.includes(paramName);
        const paramGroup = document.createElement('div');
        paramGroup.className = 'param-group';
        
        const typeInfo = paramSchema.type || 'string';
        const description = paramSchema.description || '';
        
        let inputHTML = '';
        
        if (typeInfo === 'boolean') {
            inputHTML = `
                <select name="${paramName}" ${isRequired ? 'required' : ''}>
                    <option value="">Select...</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            `;
        } else if (typeInfo === 'object' || typeInfo === 'array') {
            inputHTML = `
                <textarea name="${paramName}" placeholder="Enter JSON" ${isRequired ? 'required' : ''}></textarea>
            `;
        } else if (typeInfo === 'number' || typeInfo === 'integer') {
            inputHTML = `
                <fluent-text-field name="${paramName}" type="number" placeholder="Enter number" ${isRequired ? 'required' : ''}></fluent-text-field>
            `;
        } else {
            inputHTML = `
                <fluent-text-field name="${paramName}" type="text" placeholder="Enter text" ${isRequired ? 'required' : ''}></fluent-text-field>
            `;
        }
        
        paramGroup.innerHTML = `
            <label>
                ${paramName}
                ${isRequired ? '<span class="param-label-required">* Required</span>' : ''}
            </label>
            <div class="param-meta">Type: ${typeInfo}${description ? ` - ${description}` : ''}</div>
            ${inputHTML}
        `;
        
        // Apply theme to fluent elements before appending to DOM
        const fluentControls = paramGroup.querySelectorAll('fluent-text-field');
        if (fluentControls.length > 0) {
            await applyThemeToFluentElements(fluentControls);
        }
        
        elements.parametersContainer.appendChild(paramGroup);
    }
}

async function applyThemeToFluentElements(elements) {
    const { baseLayerLuminance, StandardLuminance } = await import('https://unpkg.com/@fluentui/web-components@2.6.1');
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    elements.forEach(control => {
        baseLayerLuminance.setValueFor(control, isDark ? StandardLuminance.DarkMode : StandardLuminance.LightMode);
    });
}

// Tool Calling
elements.parametersForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedTool) return;
    
    const formData = new FormData(e.target);
    const parameters = {};
    
    // Build parameters object
    for (const [key, value] of formData.entries()) {
        if (value === '') continue; // Skip empty optional fields
        
        const paramSchema = selectedTool.inputSchema?.properties?.[key];
        const type = paramSchema?.type || 'string';
        
        try {
            if (type === 'object' || type === 'array') {
                parameters[key] = JSON.parse(value);
            } else if (type === 'number' || type === 'integer') {
                parameters[key] = Number(value);
            } else if (type === 'boolean') {
                parameters[key] = value === 'true';
            } else {
                parameters[key] = value;
            }
        } catch (error) {
            alert(`Invalid JSON for parameter "${key}"`);
            return;
        }
    }
    
    await callTool(selectedTool.name, parameters);
});

async function callTool(toolName, parameters) {
    showLoading('Calling tool...');
    
    try {
        const response = await window.parent.mcpAPI.callTool(toolName, parameters);
        
        if (!response.success) {
            throw new Error(response.error);
        }
        
        displayResult(toolName, parameters, response.result);
        
        // Show results section and scroll to it
        elements.resultsSection.style.display = 'block';
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error calling tool:', error);
        showError(elements.serverError, `Failed to call tool: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function displayResult(toolName, parameters, result) {
    // Clear previous results - only show one result at a time
    elements.resultsContainer.innerHTML = '';
    
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    const timestamp = new Date().toLocaleTimeString();
    
    let contentHTML = '';
    
    if (result.content && Array.isArray(result.content)) {
        result.content.forEach(item => {
            if (item.type === 'text') {
                const normalizedText = normalizePathsInText(item.text);
                contentHTML += `<div class="result-text">${escapeHtml(normalizedText)}</div>`;
            } else if (item.type === 'image') {
                contentHTML += `<div class="result-meta">[Image: ${item.mimeType || 'unknown'}]</div>`;
            } else if (item.type === 'resource') {
                contentHTML += `<div class="result-meta">[Resource: ${item.resource?.uri || 'unknown'}]</div>`;
            } else {
                contentHTML += `<pre>${JSON.stringify(item, null, 2)}</pre>`;
            }
        });
    } else {
        contentHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
    }
    
    resultItem.innerHTML = `
        <strong>Tool:</strong> ${toolName} <span style="color: var(--color-neutral-foreground-3); font-size: 0.85rem;">(${timestamp})</span>
        <div style="margin-top: 0.5rem;">${contentHTML}</div>
    `;
    
    elements.resultsContainer.appendChild(resultItem);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Normalize paths in MCP results to use consistent forward slashes
function normalizePathsInText(text) {
    try {
        // Try to parse as JSON and normalize paths
        const parsed = JSON.parse(text);
        const normalized = JSON.stringify(parsed, (key, value) => {
            if (key === 'path' && typeof value === 'string') {
                return value.replace(/\\/g, '/');
            }
            return value;
        });
        return normalized;
    } catch {
        // If not valid JSON, just normalize backslashes in the raw text
        return text.replace(/\\\\/g, '/').replace(/\\/g, '/');
    }
}

// Disconnect from server
async function disconnectServer() {
    showLoading('Disconnecting...');
    
    try {
        // Disconnect from server
        await window.parent.mcpAPI.disconnect();
        
        // Reset UI
        updateStatus('Please select a server', false);
        elements.toolsSection.style.display = 'none';
        elements.parametersSection.style.display = 'none';
        elements.resultsSection.style.display = 'none';
        selectedServer = null;
        selectedTool = null;
        currentTools = [];
        
        // Reset dropdown
        elements.toolsDropdown.value = '';
        
        // Clear selections and reset buttons
        document.querySelectorAll('.mcp-server-item').forEach(el => {
            el.classList.remove('selected');
            const btn = el.querySelector('.mcp-server-action-btn');
            if (btn) btn.textContent = 'Connect';
        });
        
    } catch (error) {
        alert(`Failed to disconnect: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Event Listeners
// Dropdown change event for tool selection
elements.toolsDropdown.addEventListener('change', (e) => {
    if (!e.target.value) {
        elements.parametersSection.style.display = 'none';
        selectedTool = null;
        return;
    }
    
    const selectedTool = currentTools.find(tool => tool.name === e.target.value);
    if (selectedTool) {
        selectTool(selectedTool);
    }
});

// Disconnect on page unload or navigation
window.addEventListener('beforeunload', async (e) => {
    if (selectedServer) {
        try {
            await window.parent.mcpAPI.disconnect();
        } catch (error) {
            console.error('Error disconnecting on page unload:', error);
        }
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', fetchServers);

