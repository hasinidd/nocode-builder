import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../db/supabase.js';

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';
const REFRESH_EXPIRY = '30d';

// ── Helpers ───────────────────────────────────────────────────────────────────
const signToken = (payload, expiry = TOKEN_EXPIRY) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiry });

const formatUser = ({ id, email, name, role, created_at }) =>
  ({ id, email, name, role, created_at });

// ── Register ──────────────────────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check duplicate
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).single();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { data: user, error } = await supabase
      .from('users')
      .insert({ id: uuidv4(), email, password_hash, name, role: 'user' })
      .select('id, email, name, role, created_at')
      .single();

    if (error) throw error;

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signToken({ id: user.id, type: 'refresh' }, REFRESH_EXPIRY);

    await supabase.from('refresh_tokens').insert({ user_id: user.id, token: refreshToken });

    res.status(201).json({ user: formatUser(user), token, refreshToken });
  } catch (err) { next(err); }
};

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users').select('*').eq('email', email).single();

    if (error || !user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signToken({ id: user.id, type: 'refresh' }, REFRESH_EXPIRY);

    // Store refresh token
    await supabase.from('refresh_tokens')
      .upsert({ user_id: user.id, token: refreshToken }, { onConflict: 'user_id' });

    // Log login event
    await supabase.from('auth_events')
      .insert({ user_id: user.id, event: 'login', ip: req.ip });

    res.json({ user: formatUser(user), token, refreshToken });
  } catch (err) { next(err); }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ error: 'Refresh token required' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    if (payload.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });

    // Verify token exists in DB (rotation check)
    const { data: stored } = await supabase
      .from('refresh_tokens').select('id').eq('user_id', payload.id).eq('token', token).single();
    if (!stored) return res.status(401).json({ error: 'Refresh token revoked' });

    const { data: user } = await supabase
      .from('users').select('id, email, role').eq('id', payload.id).single();
    if (!user) return res.status(401).json({ error: 'User not found' });

    const newToken = signToken({ id: user.id, email: user.email, role: user.role });
    const newRefresh = signToken({ id: user.id, type: 'refresh' }, REFRESH_EXPIRY);

    await supabase.from('refresh_tokens')
      .update({ token: newRefresh }).eq('user_id', user.id);

    res.json({ token: newToken, refreshToken: newRefresh });
  } catch (err) { next(err); }
};

// ── Get current user ──────────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users').select('id, email, name, role, created_at').eq('id', req.user.id).single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json(formatUser(user));
  } catch (err) { next(err); }
};

// ── Change password ───────────────────────────────────────────────────────────
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { data: user } = await supabase
      .from('users').select('password_hash').eq('id', req.user.id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await supabase.from('users').update({ password_hash }).eq('id', req.user.id);

    // Revoke all refresh tokens on password change
    await supabase.from('refresh_tokens').delete().eq('user_id', req.user.id);
    await supabase.from('auth_events')
      .insert({ user_id: req.user.id, event: 'password_change', ip: req.ip });

    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    await supabase.from('refresh_tokens').delete().eq('user_id', req.user.id);
    await supabase.from('auth_events')
      .insert({ user_id: req.user.id, event: 'logout', ip: req.ip });
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
};
