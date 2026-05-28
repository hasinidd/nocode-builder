import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { getOrders, createOrder, updateOrderStatus, getProducts, createProduct } from '../controllers/orderController.js';

const router = express.Router();

router.use(authenticate);
router.get('/products',       getProducts);
router.post('/products',      createProduct);
router.get('/',               getOrders);
router.post('/',              createOrder);
router.patch('/:id/status',   updateOrderStatus);

export default router;
