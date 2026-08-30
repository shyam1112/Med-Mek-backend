import { Response } from 'express';
import Doctor from '../models/Doctor';
import { AuthRequest } from '../types';
import { getPaginationParams } from '../utils/helpers';

export const getDoctors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const { search } = req.query;

    const filter: Record<string, unknown> = { owner: req.userId };
    // Regex substring match, not $text — see customerController.getCustomers
    // for why $text's OR/token matching is the wrong tool here.
    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$or = [{ name: regex }, { clinicName: regex }];
    }

    const [doctors, total] = await Promise.all([
      Doctor.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Doctor.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: doctors,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch doctors.' });
  }
};

// Lightweight lookup for the Billing screen's doctor Autocomplete — active
// doctors only, matched by name, no pagination metadata needed.
export const searchDoctors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);

    const filter: Record<string, unknown> = { owner: req.userId, isActive: true };
    if (q) filter.name = new RegExp(q as string, 'i');

    const doctors = await Doctor.find(filter).sort({ name: 1 }).limit(limit);
    res.json({ success: true, data: doctors });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to search doctors.' });
  }
};

export const getDoctorById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doctor = await Doctor.findOne({ _id: req.params.id, owner: req.userId });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found.' });
      return;
    }
    res.json({ success: true, data: doctor });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch doctor.' });
  }
};

export const createDoctor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doctor = await Doctor.create({ ...req.body, owner: req.userId });
    res.status(201).json({ success: true, message: 'Doctor added.', data: doctor });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to add doctor.' });
  }
};

export const updateDoctor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { owner: _owner, ...updates } = req.body;
    const doctor = await Doctor.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      updates,
      { new: true }
    );
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found.' });
      return;
    }
    res.json({ success: true, message: 'Doctor updated.', data: doctor });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update doctor.' });
  }
};

export const deleteDoctor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doctor = await Doctor.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found.' });
      return;
    }
    res.json({ success: true, message: 'Doctor deleted.' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete doctor.' });
  }
};
