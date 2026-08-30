import { Request, Response } from 'express';
import MedicineCatalog from '../models/MedicineCatalog';

export const searchCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(parseInt(String(req.query.limit || '15'), 10), 50);

    if (!q || q.length < 1) {
      res.json({ success: true, data: [] });
      return;
    }

    // Text search for 2+ word queries; regex prefix search for single-word autocomplete
    const isMultiWord = q.split(' ').filter(Boolean).length > 1;

    let results;
    if (isMultiWord) {
      results = await MedicineCatalog.find(
        { $text: { $search: q } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();
    } else {
      // Regex prefix match on name + genericName for fast autocomplete typing
      const regex = new RegExp(q, 'i');
      results = await MedicineCatalog.find({
        $or: [{ name: regex }, { genericName: regex }, { manufacturer: regex }],
      })
        .sort({ name: 1 })
        .limit(limit)
        .lean();
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Catalog search failed' });
  }
};

export const getCatalogItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await MedicineCatalog.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ success: false, message: 'Catalog item not found' });
      return;
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch catalog item' });
  }
};
