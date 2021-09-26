const Order = require('../models/order');
const CashOnDelivery = require('../models/cashOnDelivery');
const Product = require('../models/product');

const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const cloudinary = require('cloudinary')

// Create a new order   =>  /api/v1/order/new
exports.newOrder = catchAsyncErrors(async (req, res, next) => {
    const {
        orderItems,
        shippingInfo,
        lensPrescription,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        paymentInfo,


    } = req.body;

    const order = await Order.create({
        orderItems,
        shippingInfo,
        lensPrescription,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        paymentInfo,
        paidAt: Date.now(),
        user: req.user._id
    })

    res.status(200).json({
        success: true,
        order
    })
})

// Get single order   => /api/v1/order/:id
exports.getSingleOrder = catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id).populate('user', 'name email')

    if (!order) {
        return next(new ErrorHandler('No Order found with this ID', 404))
    }

    res.status(200).json({
        success: true,
        order
    })
})

// Get logged in user orders   =>   /api/v1/orders/me
exports.myOrders = catchAsyncErrors(async (req, res, next) => {
    const orders = await Order.find({ user: req.user.id })

    res.status(200).json({
        success: true,
        orders
    })
})

// Get all orders - ADMIN  =>   /api/v1/admin/orders/
exports.allOrders = catchAsyncErrors(async (req, res, next) => {
    const orders = await Order.find()

    let totalAmount = 0;

    orders.forEach(order => {
        totalAmount += order.totalPrice
    })

    res.status(200).json({
        success: true,
        totalAmount,
        orders
    })
})

// Update / Process order - ADMIN  =>   /api/v1/admin/order/:id
exports.updateOrder = catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id)

    if (order.orderStatus === 'Delivered') {
        return next(new ErrorHandler('You have already delivered this order', 400))
    }

    order.orderItems.forEach(async item => {
        await updateStock(item.product, item.quantity)
    })

    order.orderStatus = req.body.status,
        order.deliveredAt = Date.now()

    await order.save()

    res.status(200).json({
        success: true,
    })
})

async function updateStock(id, quantity) {
    const product = await Product.findById(id);

    product.stock = product.stock - quantity;

    await product.save({ validateBeforeSave: false })
}

// Delete order   =>   /api/v1/admin/order/:id
exports.deleteOrder = catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id)

    if (!order) {
        return next(new ErrorHandler('No Order found with this ID', 404))
    }

    await order.remove()

    res.status(200).json({
        success: true
    })
})

// Create a new cash on Delivery order   =>  /api/v1/order/new
exports.cashOnNewOrder = catchAsyncErrors(async (req, res) => {
    let result = '';
    if (req.body.lensPrescription.uploadedPrescription) {
        result = await cloudinary.v2.uploader.upload(req.body.lensPrescription.uploadedPrescription, {
            folder: 'Lens_Receipts',
            width: 150,
            crop: "scale"
        });
    };

    const {
        orderItems,
        shippingInfo,
        lensPrescription,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
    } = req.body;

    lensPrescription.uploadedPrescription = result ? result.secure_url : '';

    const codOrder = await CashOnDelivery.create({
        orderItems,
        shippingInfo,
        lensPrescription,
        itemsPrice,
        paymentInfo: { status: "cash on delivery" },
        taxPrice,
        shippingPrice,
        totalPrice,
        paidAt: Date.now(),
        user: req.user._id
    })

    res.status(200).json({
        success: true,
        codOrder
    })
})

// Get logged in user Codorders   =>   /api/v1/codorders/me
exports.myCodOrders = catchAsyncErrors(async (req, res) => {
    const orders = await Order.find({ user: req.user.id })

    res.status(200).json({
        success: true,
        orders
    })
})