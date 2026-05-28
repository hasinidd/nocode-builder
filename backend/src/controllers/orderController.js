import supabase from '../db/supabase.js';

export const getProducts = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('products').select('*, variants(*)').eq('agent_id', req.query.agentId);
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

export const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, agentId, variants } = req.body;
    const { data: product, error } = await supabase
      .from('products').insert({ name, description, price, agent_id: agentId }).select().single();
    if (error) throw error;
    if (variants?.length) {
      await supabase.from('variants').insert(variants.map(v => ({ ...v, product_id: product.id })));
    }
    res.status(201).json(product);
  } catch (err) { next(err); }
};

export const getOrders = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('orders').select('*, products(name, price)').eq('agent_id', req.query.agentId);
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

export const createOrder = async (req, res, next) => {
  try {
    const { agentId, productId, variantId, quantity, customerInfo } = req.body;
    const { data, error } = await supabase
      .from('orders').insert({ agent_id: agentId, product_id: productId, variant_id: variantId, quantity, customer_info: customerInfo, status: 'pending' }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase.from('orders').update({ status }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};
