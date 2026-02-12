const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

class UserService {
  constructor() {
    this.users = [];
    this.initializeUsersFile();
  }

  /**
   * Initialize users.json file if it doesn't exist
   */
  async initializeUsersFile() {
    try {
      await fs.access(USERS_FILE);
    } catch (error) {
      // File doesn't exist, create it with empty structure
      await this.saveUsers({ users: [] });
    }
    await this.loadUsers();
  }

  /**
   * Load users from JSON file
   */
  async loadUsers() {
    try {
      const data = await fs.readFile(USERS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      this.users = parsed.users || [];
    } catch (error) {
      console.error('Error loading users:', error);
      this.users = [];
    }
  }

  /**
   * Save users to JSON file
   */
  async saveUsers(data = null) {
    try {
      const usersData = data || { users: this.users };
      await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving users:', error);
      throw error;
    }
  }

  /**
   * Generate unique user ID
   */
  generateUserId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Create a new user
   */
  async createUser(username, password, email = '') {
    await this.loadUsers();

    // Check if username already exists
    if (this.users.find(u => u.username === username)) {
      throw new Error('Username already exists');
    }

    // Validate input
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user object
    const user = {
      id: this.generateUserId(),
      username: username.trim(),
      passwordHash: passwordHash,
      email: email.trim(),
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    // Add to users array
    this.users.push(user);

    // Save to file
    await this.saveUsers();

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    };
  }

  /**
   * Find user by username
   */
  async findUserByUsername(username) {
    await this.loadUsers();
    return this.users.find(u => u.username === username);
  }

  /**
   * Find user by ID
   */
  async findUserById(userId) {
    await this.loadUsers();
    return this.users.find(u => u.id === userId);
  }

  /**
   * Validate password
   */
  async validatePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId) {
    await this.loadUsers();
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.lastLogin = new Date().toISOString();
      await this.saveUsers();
    }
  }

  /**
   * Authenticate user
   */
  async authenticate(username, password) {
    const user = await this.findUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await this.validatePassword(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    // Update last login
    await this.updateLastLogin(user.id);

    return {
      id: user.id,
      username: user.username,
      email: user.email
    };
  }
}

module.exports = new UserService();
