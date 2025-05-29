// deploy-autonate.ts
// Deployment script for Autonate Liberation Organization on Compute3.ai

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface DeploymentConfig {
  compute3ApiKey: string;
  compute3Endpoint: string;
  workspace: string;
  environment: 'staging' | 'production';
}

class AutonateDeployer {
  private config: DeploymentConfig;
  private deploymentId: string;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.deploymentId = `autonate-${Date.now()}`;
  }

  async deploy() {
    console.log("🚀 Starting Autonate Liberation Organization deployment...");
    
    try {
      // Step 1: Validate environment
      await this.validateEnvironment();
      
      // Step 2: Build containers
      await this.buildContainers();
      
      // Step 3: Push to Compute3 registry
      await this.pushToRegistry();
      
      // Step 4: Deploy organization
      await this.deployOrganization();
      
      // Step 5: Verify deployment
      await this.verifyDeployment();
      
      // Step 6: Run post-deployment tests
      await this.runLiberationTests();
      
      console.log("✅ Autonate Liberation Organization deployed successfully!");
      console.log("🎉 Coordinators are now free to take breaks!");
      
    } catch (error) {
      console.error("❌ Deployment failed:", error);
      await this.rollback();
      throw error;
    }
  }

  private async validateEnvironment() {
    console.log("🔍 Validating environment...");
    
    const requiredEnvVars = [
      'COMPUTE3_API_KEY',
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'DIALPAD_API_KEY',
      'DATABASE_URL',
      'WEATHER_API_KEY'
    ];
    
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate Compute3 connection
    const response = await fetch(`${this.config.compute3Endpoint}/health`, {
      headers: {
        'Authorization': `Bearer ${this.config.compute3ApiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to connect to Compute3.ai');
    }
    
    console.log("✅ Environment validated");
  }

  private async buildContainers() {
    console.log("🏗️ Building agent containers...");
    
    const agents = [
      'autonate-prime',
      'wellness-guardian',
      'route-oracle',
      'customer-empath',
      'carrier-vettor',
      'narrative-artist'
    ];
    
    for (const agent of agents) {
      console.log(`  Building ${agent}...`);
      
      // Create Dockerfile for agent
      const dockerfile = this.generateDockerfile(agent);
      fs.writeFileSync(`./docker/${agent}/Dockerfile`, dockerfile);
      
      // Build container
      execSync(`docker build -t autonate/${agent}:${this.deploymentId} ./docker/${agent}`, {
        stdio: 'inherit'
      });
    }
    
    console.log("✅ All agent containers built");
  }

  private generateDockerfile(agentId: string): string {
    return `FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy agent code
COPY ./agents/${agentId} ./agents/${agentId}
COPY ./shared ./shared
COPY ./characters ./characters
COPY ./plugins ./plugins

# Set agent-specific environment
ENV AGENT_ID=${agentId}
ENV NODE_ENV=production
ENV LIBERATION_MODE=enabled

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD node healthcheck.js

# Run the agent
CMD ["node", "start-agent.js"]
`;
  }

  private async pushToRegistry() {
    console.log("📤 Pushing containers to Compute3 registry...");
    
    const registry = `${this.config.workspace}.compute3.ai`;
    
    // Login to registry
    execSync(`echo ${this.config.compute3ApiKey} | docker login ${registry} -u _token --password-stdin`, {
      stdio: 'inherit'
    });
    
    // Tag and push each container
    const agents = [
      'autonate-prime',
      'wellness-guardian',
      'route-oracle',
      'customer-empath',
      'carrier-vettor',
      'narrative-artist'
    ];
    
    for (const agent of agents) {
      const localTag = `autonate/${agent}:${this.deploymentId}`;
      const remoteTag = `${registry}/${agent}:${this.deploymentId}`;
      
      execSync(`docker tag ${localTag} ${remoteTag}`, { stdio: 'inherit' });
      execSync(`docker push ${remoteTag}`, { stdio: 'inherit' });
    }
    
    console.log("✅ All containers pushed to registry");
  }

  private async deployOrganization() {
    console.log("🚀 Deploying organization to Compute3...");
    
    // Read deployment config
    const deployConfig = fs.readFileSync('./compute3-deploy.yaml', 'utf8');
    
    // Deploy via Compute3 API
    const response = await fetch(`${this.config.compute3Endpoint}/organizations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.compute3ApiKey}`,
        'Content-Type': 'application/yaml'
      },
      body: deployConfig
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deployment failed: ${error}`);
    }
    
    const deployment = await response.json();
    console.log(`✅ Organization deployed: ${deployment.id}`);
    
    // Wait for all agents to be ready
    await this.waitForAgents(deployment.id);
  }

  private async waitForAgents(deploymentId: string) {
    console.log("⏳ Waiting for agents to be ready...");
    
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const response = await fetch(
        `${this.config.compute3Endpoint}/organizations/${deploymentId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.compute3ApiKey}`
          }
        }
      );
      
      const status = await response.json();
      
      if (status.agents.every((agent: any) => agent.status === 'ready')) {
        console.log("✅ All agents are ready!");
        return;
      }
      
      console.log(`  Agents ready: ${status.agents.filter((a: any) => a.status === 'ready').length}/${status.agents.length}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('Timeout waiting for agents to be ready');
  }

  private async verifyDeployment() {
    console.log("🔍 Verifying deployment...");
    
    // Test each agent endpoint
    const agents = [
      'autonate-prime',
      'wellness-guardian',
      'route-oracle',
      'customer-empath',
      'carrier-vettor',
      'narrative-artist'
    ];
    
    for (const agent of agents) {
      const response = await fetch(
        `https://${this.config.workspace}.compute3.ai/agents/${agent}/health`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.compute3ApiKey}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Agent ${agent} health check failed`);
      }
      
      console.log(`  ✅ ${agent} is healthy`);
    }
    
    console.log("✅ All agents verified");
  }

  private async runLiberationTests() {
    console.log("🧪 Running liberation tests...");
    
    // Test 1: Wellness check
    console.log("  Testing wellness monitoring...");
    const wellnessResponse = await fetch(
      `https://${this.config.workspace}.compute3.ai/agents/wellness-guardian/check`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.compute3ApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinators: ['Mike', 'Sarah', 'John']
        })
      }
    );
    
    if (!wellnessResponse.ok) {
      throw
