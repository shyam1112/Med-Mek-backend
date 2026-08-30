import { Response } from 'express';
import Customer from '../models/Customer';
import Sale from '../models/Sale';
import { AuthRequest } from '../types';
import { getPaginationParams } from '../utils/helpers';

export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const { search } = req.query;

    const filter: Record<string, unknown> = { owner: req.userId };
    // Regex substring match on name/mobile — not $text, which does OR/token
    // matching and can surface unrelated customers that merely share a word
    // with the query (a real mis-attribution risk when picking a bill's customer).
    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$or = [{ name: regex }, { mobile: regex }];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Customer.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, owner: req.userId });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }
    res.json({ success: true, data: customer });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch customer.' });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.create({ ...req.body, owner: req.userId });
    res.status(201).json({ success: true, message: 'Customer created.', data: customer });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to create customer.' });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { owner: _owner, ...updates } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      updates,
      { new: true }
    );
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }
    res.json({ success: true, message: 'Customer updated.', data: customer });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update customer.' });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }
    res.json({ success: true, message: 'Customer deleted.' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete customer.' });
  }
};

export const getCustomerBillingHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const filter = { owner: req.userId, customer: req.params.id };
    const [sales, total] = await Promise.all([
      Sale.find(filter).sort({ saleDate: -1 }).skip(skip).limit(limit),
      Sale.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: sales,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch billing history.' });
  }
};
