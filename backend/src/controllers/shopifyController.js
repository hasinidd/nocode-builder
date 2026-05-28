import { ShopifyService } from '../services/shopifyService.js';

export const syncShopifyProducts = async (req, res, next) => {
  try {
    const { shopDomain, accessToken, agentId } = req.body;
    const shopify = new ShopifyService(shopDomain, accessToken);
    const result = await shopify.syncProductsToAgent(agentId);
    res.json(result);
  } catch (err) { next(err); }
};
