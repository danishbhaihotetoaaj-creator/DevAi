#!/usr/bin/env tsx

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { execSync } from 'child_process';

interface Vulnerability {
  file: string;
  line: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  description: string;
  recommendation: string;
  cwe?: string;
  cvss?: number;
}

interface SecurityReport {
  summary: {
    totalVulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  vulnerabilities: Vulnerability[];
  recommendations: string[];
  timestamp: string;
}

class SecurityAuditor {
  private vulnerabilities: Vulnerability[] = [];
  private scannedFiles: Set<string> = new Set();
  private excludedDirs = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage'];
  private excludedExtensions = ['.log', '.lock', '.min.js', '.min.css'];

  constructor(private rootDir: string) {}

  async runAudit(): Promise<SecurityReport> {
    console.log('🔒 Starting comprehensive security audit...\n');
    
    // Scan all files
    await this.scanDirectory(this.rootDir);
    
    // Run additional security checks
    await this.runDependencyAudit();
    await this.runCodeQualityChecks();
    await this.runConfigurationAudit();
    
    // Generate report
    const report = this.generateReport();
    
    // Save report
    this.saveReport(report);
    
    return report;
  }

  private async scanDirectory(dir: string): Promise<void> {
    try {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!this.excludedDirs.includes(item)) {
            await this.scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          await this.scanFile(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dir}:`, error);
    }
  }

  private async scanFile(filePath: string): Promise<void> {
    const ext = extname(filePath);
    if (this.excludedExtensions.includes(ext)) return;
    
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      this.scannedFiles.add(filePath);
      
      // Scan for various vulnerability patterns
      await this.scanForSQLInjection(filePath, lines);
      await this.scanForXSS(filePath, lines);
      await this.scanForCommandInjection(filePath, lines);
      await this.scanForPathTraversal(filePath, lines);
      await this.scanForHardcodedSecrets(filePath, lines);
      await this.scanForWeakCrypto(filePath, lines);
      await this.scanForInsecureDependencies(filePath, lines);
      await this.scanForAuthenticationBypass(filePath, lines);
      await this.scanForAuthorizationIssues(filePath, lines);
      await this.scanForDataExposure(filePath, lines);
      await this.scanForLoggingIssues(filePath, lines);
      await this.scanForErrorHandling(filePath, lines);
      
    } catch (error) {
      console.warn(`Warning: Could not scan file ${filePath}:`, error);
    }
  }

  private async scanForSQLInjection(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /\.query\s*\(\s*['"`][^'"`]*\$\{[^}]*\}[^'"`]*['"`]/, description: 'Potential SQL injection via template literals' },
      { pattern: /\.query\s*\(\s*['"`][^'"`]*\s*\+\s*\w+[^'"`]*['"`]/, description: 'Potential SQL injection via string concatenation' },
      { pattern: /\.raw\s*\(\s*['"`][^'"`]*\$\{[^}]*\}[^'"`]*['"`]/, description: 'Potential SQL injection via raw queries' },
      { pattern: /execute\s*\(\s*['"`][^'"`]*\$\{[^}]*\}[^'"`]*['"`]/, description: 'Potential SQL injection via execute statements' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'HIGH',
            category: 'SQL Injection',
            description,
            recommendation: 'Use parameterized queries or prepared statements instead of string concatenation',
            cwe: 'CWE-89',
            cvss: 8.8,
          });
        }
      }
    }
  }

  private async scanForXSS(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\w+/, description: 'Potential XSS via dangerouslySetInnerHTML' },
      { pattern: /innerHTML\s*=\s*\w+/, description: 'Potential XSS via innerHTML assignment' },
      { pattern: /document\.write\s*\(\s*\w+/, description: 'Potential XSS via document.write' },
      { pattern: /eval\s*\(\s*\w+/, description: 'Potential XSS via eval function' },
      { pattern: /new Function\s*\(\s*\w+/, description: 'Potential XSS via Function constructor' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'HIGH',
            category: 'Cross-Site Scripting (XSS)',
            description,
            recommendation: 'Sanitize all user input and avoid using dangerous DOM manipulation methods',
            cwe: 'CWE-79',
            cvss: 6.1,
          });
        }
      }
    }
  }

  private async scanForCommandInjection(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /exec\s*\(\s*\w+/, description: 'Potential command injection via exec' },
      { pattern: /spawn\s*\(\s*\w+/, description: 'Potential command injection via spawn' },
      { pattern: /execSync\s*\(\s*\w+/, description: 'Potential command injection via execSync' },
      { pattern: /child_process\.exec\s*\(\s*\w+/, description: 'Potential command injection via child_process.exec' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'CRITICAL',
            category: 'Command Injection',
            description,
            recommendation: 'Avoid executing system commands with user input. If necessary, validate and sanitize all inputs',
            cwe: 'CWE-78',
            cvss: 9.8,
          });
        }
      }
    }
  }

  private async scanForPathTraversal(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /readFileSync\s*\(\s*\w+/, description: 'Potential path traversal via readFileSync' },
      { pattern: /readFile\s*\(\s*\w+/, description: 'Potential path traversal via readFile' },
      { pattern: /writeFileSync\s*\(\s*\w+/, description: 'Potential path traversal via writeFileSync' },
      { pattern: /writeFile\s*\(\s*\w+/, description: 'Potential path traversal via writeFile' },
      { pattern: /fs\.readFile\s*\(\s*\w+/, description: 'Potential path traversal via fs.readFile' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'HIGH',
            category: 'Path Traversal',
            description,
            recommendation: 'Validate and sanitize file paths. Use path.resolve() and path.join() for safe path construction',
            cwe: 'CWE-22',
            cvss: 7.5,
          });
        }
      }
    }
  }

  private async scanForHardcodedSecrets(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /api_key\s*[:=]\s*['"`][^'"`]{20,}['"`]/, description: 'Potential hardcoded API key' },
      { pattern: /secret\s*[:=]\s*['"`][^'"`]{20,}['"`]/, description: 'Potential hardcoded secret' },
      { pattern: /password\s*[:=]\s*['"`][^'"`]{8,}['"`]/, description: 'Potential hardcoded password' },
      { pattern: /token\s*[:=]\s*['"`][^'"`]{20,}['"`]/, description: 'Potential hardcoded token' },
      { pattern: /sk-[a-zA-Z0-9]{48}/, description: 'Potential hardcoded API key (sk- format)' },
      { pattern: /pk_[a-zA-Z0-9]{48}/, description: 'Potential hardcoded API key (pk_ format)' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'CRITICAL',
            category: 'Hardcoded Secrets',
            description,
            recommendation: 'Move all secrets to environment variables or secure secret management systems',
            cwe: 'CWE-798',
            cvss: 9.8,
          });
        }
      }
    }
  }

  private async scanForWeakCrypto(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /crypto\.createHash\s*\(\s*['"`]md5['"`]/, description: 'Weak cryptographic hash (MD5)' },
      { pattern: /crypto\.createHash\s*\(\s*['"`]sha1['"`]/, description: 'Weak cryptographic hash (SHA1)' },
      { pattern: /crypto\.createCipher\s*\(\s*['"`]des['"`]/, description: 'Weak encryption algorithm (DES)' },
      { pattern: /crypto\.createCipher\s*\(\s*['"`]rc4['"`]/, description: 'Weak encryption algorithm (RC4)' },
      { pattern: /bcrypt\.hashSync\s*\(\s*\w+,\s*5/, description: 'Weak bcrypt rounds (should be >= 10)' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'MEDIUM',
            category: 'Weak Cryptography',
            description,
            recommendation: 'Use strong cryptographic algorithms and appropriate key sizes',
            cwe: 'CWE-327',
            cvss: 5.3,
          });
        }
      }
    }
  }

  private async scanForInsecureDependencies(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /require\s*\(\s*['"`]http['"`]/, description: 'Insecure HTTP protocol usage' },
      { pattern: /import.*from\s*['"`]http['"`]/, description: 'Insecure HTTP protocol usage' },
      { pattern: /new\s+http\.Server/, description: 'Insecure HTTP server creation' },
      { pattern: /http\.createServer/, description: 'Insecure HTTP server creation' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'MEDIUM',
            category: 'Insecure Dependencies',
            description,
            recommendation: 'Use HTTPS instead of HTTP for production environments',
            cwe: 'CWE-200',
            cvss: 5.3,
          });
        }
      }
    }
  }

  private async scanForAuthenticationBypass(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /if\s*\(\s*!auth\s*\)\s*return\s*null/, description: 'Potential authentication bypass' },
      { pattern: /if\s*\(\s*!user\s*\)\s*return\s*null/, description: 'Potential authentication bypass' },
      { pattern: /if\s*\(\s*!token\s*\)\s*return\s*null/, description: 'Potential authentication bypass' },
      { pattern: /auth\s*===\s*false/, description: 'Potential authentication bypass' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'HIGH',
            category: 'Authentication Bypass',
            description,
            recommendation: 'Implement proper authentication checks with secure session management',
            cwe: 'CWE-287',
            cvss: 8.1,
          });
        }
      }
    }
  }

  private async scanForAuthorizationIssues(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /if\s*\(\s*user\.role\s*===\s*['"`]admin['"`]/, description: 'Potential authorization bypass' },
      { pattern: /if\s*\(\s*user\.permissions\s*\.includes\s*\(\s*['"`]admin['"`]/, description: 'Potential authorization bypass' },
      { pattern: /user\.isAdmin\s*\(\s*\)/, description: 'Potential authorization bypass' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'HIGH',
            category: 'Authorization Issues',
            description,
            recommendation: 'Implement proper role-based access control (RBAC) with server-side validation',
            cwe: 'CWE-285',
            cvss: 8.1,
          });
        }
      }
    }
  }

  private async scanForDataExposure(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /console\.log\s*\(\s*\w+/, description: 'Potential sensitive data exposure via console.log' },
      { pattern: /console\.error\s*\(\s*\w+/, description: 'Potential sensitive data exposure via console.error' },
      { pattern: /res\.json\s*\(\s*\{.*password/, description: 'Potential password exposure in API response' },
      { pattern: /res\.json\s*\(\s*\{.*secret/, description: 'Potential secret exposure in API response' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'MEDIUM',
            category: 'Data Exposure',
            description,
            recommendation: 'Remove or redact sensitive information from logs and API responses',
            cwe: 'CWE-200',
            cvss: 5.3,
          });
        }
      }
    }
  }

  private async scanForLoggingIssues(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /console\.log\s*\(\s*req\.body/, description: 'Potential logging of sensitive request data' },
      { pattern: /console\.log\s*\(\s*req\.headers/, description: 'Potential logging of sensitive headers' },
      { pattern: /console\.log\s*\(\s*req\.cookies/, description: 'Potential logging of sensitive cookies' },
      { pattern: /winston\.log\s*\(\s*['"`]info['"`],\s*req\.body/, description: 'Potential logging of sensitive request data' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'LOW',
            category: 'Logging Issues',
            description,
            recommendation: 'Avoid logging sensitive information. Implement log filtering and sanitization',
            cwe: 'CWE-532',
            cvss: 3.1,
          });
        }
      }
    }
  }

  private async scanForErrorHandling(filePath: string, lines: string[]): Promise<void> {
    const patterns = [
      { pattern: /catch\s*\(\s*\)\s*\{\s*\}/, description: 'Empty error handler' },
      { pattern: /catch\s*\(\s*error\s*\)\s*\{\s*console\.log\s*\(\s*error\s*\)\s*\}/, description: 'Insufficient error handling' },
      { pattern: /throw\s+new\s+Error\s*\(\s*error\s*\)/, description: 'Potential information disclosure in error messages' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, description } of patterns) {
        if (pattern.test(line)) {
          this.addVulnerability({
            file: filePath,
            line: i + 1,
            severity: 'LOW',
            category: 'Error Handling',
            description,
            recommendation: 'Implement proper error handling with logging and user-friendly messages',
            cwe: 'CWE-390',
            cvss: 3.1,
          });
        }
      }
    }
  }

  private async runDependencyAudit(): Promise<void> {
    try {
      console.log('📦 Running dependency security audit...');
      const result = execSync('npm audit --json', { encoding: 'utf-8' });
      const auditData = JSON.parse(result);
      
      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(([pkg, vuln]: [string, any]) => {
          this.addVulnerability({
            file: 'package.json',
            line: 0,
            severity: this.mapNpmSeverity(vuln.severity),
            category: 'Dependency Vulnerability',
            description: `Vulnerable dependency: ${pkg} - ${vuln.title}`,
            recommendation: `Update ${pkg} to version ${vuln.recommendation || 'latest'}`,
            cwe: vuln.cwe?.[0] || undefined,
            cvss: this.mapNpmSeverityToCVSS(vuln.severity),
          });
        });
      }
    } catch (error) {
      console.warn('Warning: Could not run npm audit:', error);
    }
  }

  private async runCodeQualityChecks(): Promise<void> {
    try {
      console.log('🔍 Running code quality checks...');
      
      // Check for TypeScript compilation errors
      try {
        execSync('npx tsc --noEmit', { encoding: 'utf-8' });
      } catch (error) {
        const output = error.toString();
        if (output.includes('error TS')) {
          this.addVulnerability({
            file: 'TypeScript compilation',
            line: 0,
            severity: 'MEDIUM',
            category: 'Code Quality',
            description: 'TypeScript compilation errors detected',
            recommendation: 'Fix all TypeScript compilation errors before deployment',
            cwe: 'CWE-398',
            cvss: 4.0,
          });
        }
      }

      // Check for ESLint issues
      try {
        execSync('npx eslint . --ext .ts,.tsx --format json', { encoding: 'utf-8' });
      } catch (error) {
        const output = error.toString();
        if (output.includes('ESLint')) {
          this.addVulnerability({
            file: 'ESLint',
            line: 0,
            severity: 'LOW',
            category: 'Code Quality',
            description: 'ESLint issues detected',
            recommendation: 'Fix all ESLint issues to maintain code quality standards',
            cwe: 'CWE-398',
            cvss: 2.0,
          });
        }
      }
    } catch (error) {
      console.warn('Warning: Could not run code quality checks:', error);
    }
  }

  private async runConfigurationAudit(): Promise<void> {
    try {
      console.log('⚙️ Running configuration audit...');
      
      // Check for environment file exposure
      const envFiles = ['.env', '.env.local', '.env.production'];
      for (const envFile of envFiles) {
        try {
          const content = readFileSync(envFile, 'utf-8');
          if (content.includes('API_KEY') || content.includes('SECRET') || content.includes('PASSWORD')) {
            this.addVulnerability({
              file: envFile,
              line: 0,
              severity: 'CRITICAL',
              category: 'Configuration',
              description: `Environment file ${envFile} contains sensitive information`,
              recommendation: 'Move sensitive information to secure environment variables or secret management systems',
              cwe: 'CWE-532',
              cvss: 9.8,
            });
          }
        } catch (error) {
          // File doesn't exist, which is good
        }
      }

      // Check for exposed configuration files
      const configFiles = ['config.json', 'secrets.json', 'credentials.json'];
      for (const configFile of configFiles) {
        try {
          const content = readFileSync(configFile, 'utf-8');
          if (content.includes('"key"') || content.includes('"secret"') || content.includes('"password"')) {
            this.addVulnerability({
              file: configFile,
              line: 0,
              severity: 'HIGH',
              category: 'Configuration',
              description: `Configuration file ${configFile} contains sensitive information`,
              recommendation: 'Move sensitive configuration to environment variables',
              cwe: 'CWE-532',
              cvss: 7.5,
            });
          }
        } catch (error) {
          // File doesn't exist, which is good
        }
      }
    } catch (error) {
      console.warn('Warning: Could not run configuration audit:', error);
    }
  }

  private addVulnerability(vuln: Vulnerability): void {
    this.vulnerabilities.push(vuln);
  }

  private mapNpmSeverity(severity: string): Vulnerability['severity'] {
    switch (severity.toLowerCase()) {
      case 'critical': return 'CRITICAL';
      case 'high': return 'HIGH';
      case 'moderate': return 'MEDIUM';
      case 'low': return 'LOW';
      default: return 'INFO';
    }
  }

  private mapNpmSeverityToCVSS(severity: string): number {
    switch (severity.toLowerCase()) {
      case 'critical': return 9.8;
      case 'high': return 8.1;
      case 'moderate': return 5.3;
      case 'low': return 3.1;
      default: return 1.0;
    }
  }

  private generateReport(): SecurityReport {
    const summary = {
      totalVulnerabilities: this.vulnerabilities.length,
      critical: this.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
      high: this.vulnerabilities.filter(v => v.severity === 'HIGH').length,
      medium: this.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
      low: this.vulnerabilities.filter(v => v.severity === 'LOW').length,
      info: this.vulnerabilities.filter(v => v.severity === 'INFO').length,
    };

    const recommendations = [
      'Address all CRITICAL and HIGH severity vulnerabilities immediately',
      'Implement proper input validation and sanitization',
      'Use parameterized queries for database operations',
      'Move all secrets to environment variables',
      'Implement proper authentication and authorization',
      'Use HTTPS in production environments',
      'Regularly update dependencies',
      'Implement proper error handling and logging',
      'Conduct regular security audits',
      'Follow security best practices and OWASP guidelines',
    ];

    return {
      summary,
      vulnerabilities: this.vulnerabilities.sort((a, b) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }

  private saveReport(report: SecurityReport): void {
    const reportPath = join(this.rootDir, 'security-audit-report.json');
    const reportContent = JSON.stringify(report, null, 2);
    
    try {
      require('fs').writeFileSync(reportPath, reportContent);
      console.log(`\n📄 Security report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Error saving security report:', error);
    }
  }
}

// Main execution
async function main() {
  const rootDir = process.cwd();
  const auditor = new SecurityAuditor(rootDir);
  
  try {
    const report = await auditor.runAudit();
    
    console.log('\n🔒 Security Audit Complete!');
    console.log('=====================================');
    console.log(`Total Vulnerabilities: ${report.summary.totalVulnerabilities}`);
    console.log(`Critical: ${report.summary.critical}`);
    console.log(`High: ${report.summary.high}`);
    console.log(`Medium: ${report.summary.medium}`);
    console.log(`Low: ${report.summary.low}`);
    console.log(`Info: ${report.summary.info}`);
    
    if (report.summary.critical > 0 || report.summary.high > 0) {
      console.log('\n⚠️  CRITICAL and HIGH severity vulnerabilities detected!');
      console.log('Please address these immediately before deployment.');
    }
    
    console.log('\n📋 Top Recommendations:');
    report.recommendations.slice(0, 5).forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
    
    console.log('\n📊 Detailed report saved to security-audit-report.json');
    
  } catch (error) {
    console.error('Security audit failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}