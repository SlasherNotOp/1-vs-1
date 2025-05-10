const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

class AuthController {
  constructor(prisma) { this.prisma = prisma; }

  async register(req, res) {
    const { username, email, password } = req.body;
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (exists) return res.status(400).json({ error: 'User exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { username, email, password: hash }
    });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '24h'
    });
    const { password: _, ...u } = user;
    res.status(201).json({ user: u, token });
  }

  async login(req, res) {
    const { email, password } = req.body;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '24h'
    });
    const { password: _, ...u } = user;
    res.json({ user: u, token });
  }
}

module.exports = { AuthController };
