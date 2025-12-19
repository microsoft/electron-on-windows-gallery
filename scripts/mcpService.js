const { execFile } = require('child_process');
const { promisify } = require('util');
const { Client } = require('@modelcontextprotocol/sdk/client');
const { StdioClientTransport } = require('../node_modules/@modelcontextprotocol/sdk/dist/cjs/client/stdio.js');

const execFileAsync = promisify(execFile);

/**
 * MCP Service - Handles all MCP server operations
 */
class MCPService {
    constructor() {
        this.client = null;
        this.transport = null;
    }

    /**
     * Fetch list of MCP servers from odr.exe
     */
    async fetchServerList() {
        console.log('Running odr.exe list...');
        
        try {
            const { stdout, stderr } = await execFileAsync('odr.exe', ['list']);
            
            if (stderr) {
                console.error('odr.exe stderr:', stderr);
            }
            
            const servers = JSON.parse(stdout);
            
            if (!Array.isArray(servers.servers)) {
                throw new Error(`Expected an array of servers, but got: ${typeof servers}`);
            }
            
            return servers.servers;
        } catch (error) {
            // Check if odr.exe exists in PATH
            if (error.code === 'ENOENT') {
                throw new Error('odr.exe not found in PATH. Please ensure the Windows MCP SDK tools are installed.');
            }
            
            // If it's a command error, provide more context
            if (error.message) {
                throw new Error(`odr.exe failed: ${error.message}`);
            }
            
            throw error;
        }
    }

    /**
     * Connect to an MCP server
     */
    async connectToServer(server) {
        const identifier = server.packages?.[0]?.identifier;
        const command = "odr.exe";
        const args = ["mcp", "--proxy", identifier];

        if (!identifier) {
            throw new Error('Server configuration missing identifier.');
        }
        
        console.log(`Connecting to: ${server.id}`);
        console.log(`Running server: ${command} ${args.join(' ')}`);
        
        try {
            // Create MCP client with stdio transport
            // Capture stderr to see any error output from odr.exe
            console.log('Creating StdioClientTransport...');
            this.transport = new StdioClientTransport({
                command: command,
                args: args,
                stderr: 'pipe'  // Changed from 'ignore' to 'pipe' to capture errors
            });
            
            // Log stderr output for debugging
            if (this.transport.childProcess && this.transport.childProcess.stderr) {
                this.transport.childProcess.stderr.on('data', (data) => {
                    console.error('[odr.exe stderr]', data.toString());
                });
            }
            
            console.log('Creating MCP Client...');
            this.client = new Client({
                name: 'mcp-electron-client',
                version: '1.0.0'
            }, {
                capabilities: {}
            });
            
            // Listen for process errors
            if (this.transport.childProcess) {
                this.transport.childProcess.on('error', (error) => {
                    console.error('[odr.exe process error]', error);
                });
                this.transport.childProcess.on('exit', (code, signal) => {
                    console.log(`[odr.exe process exit] code: ${code}, signal: ${signal}`);
                });
            }
            
            console.log('Connecting MCP client to transport...');
            await this.client.connect(this.transport);
            
            console.log('MCP client connected successfully');
            
            return {
                success: true,
                serverName: server.name || server.id
            };
        } catch (error) {
            console.error('Connection error:', error);
            
            // Clean up on failure
            if (this.client) {
                try {
                    await this.client.close();
                } catch (e) {
                    console.error('Error closing client after failed connection:', e);
                }
            }
            this.client = null;
            this.transport = null;
            
            throw error;
        }
    }

    /**
     * List available tools from connected server
     */
    async listTools() {
        if (!this.client) {
            throw new Error('Not connected to any server. Call connectToServer first.');
        }
        
        const toolsResponse = await this.client.listTools();
        return toolsResponse.tools || [];
    }

    /**
     * Call a tool with given parameters
     */
    async callTool(toolName, parameters) {
        if (!this.client) {
            throw new Error('Not connected to any server. Call connectToServer first.');
        }
        
        console.log(`Calling tool: ${toolName}`);
        console.log('Parameters:', JSON.stringify(parameters, null, 2));
        
        const result = await this.client.callTool({
            name: toolName,
            arguments: parameters
        });
        
        return result;
    }

    /**
     * Disconnect from current server
     */
    async disconnect() {
        if (this.client) {
            try {
                await this.client.close();
            } catch (err) {
                console.error('Error closing client:', err);
            }
            this.client = null;
            this.transport = null;
        }
    }

    /**
     * Check if currently connected to a server
     */
    isConnected() {
        return this.client !== null;
    }
}

module.exports = { MCPService };
