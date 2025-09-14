import { Injectable } from '@angular/core';
import { Router } from "@angular/router";

// src/app/services/mock-data.service.ts


/** شكل الماستر الكامل زي ما هنعرِضه في صفحة Golden Summary */
export interface GoldenMasterFull {
  // General Data
  goldenCode: string;
  oldCode: string;
  companyName: string;
  companyNameAr: string;
  customerType: 'sole_proprietorship'|'limited_liability'|'joint_stock'|'partnership'|'public_sector'|'other';
  ownerFullName: string;
  taxNumber: string;
  streetName: string;
  buildingNumber: string;
  city: string;
  country: string;

  // Customer Contacts
  contactName: string;
  jobTitle: string;
  email: string;
  mobile: string;
  landline: string;
  preferredLanguage: 'English'|'Arabic'|'French';

  // Commercial Registration
  commercialRegistrationDoc?: string;
  taxCertificateDoc?: string;

  // Sales Area
  salesOrg: string;
  distributionChannel: string;
  division: string;
}

/** صف الدوبلكيت في الجدول تحت */
export interface DuplicateRow {
  oldCode: string;
  goldenCode: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  taxNumber: string;
  salesOrg: string;
  division: string;
}

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private _master: GoldenMasterFull | null = null;
  private _duplicates: DuplicateRow[] = [];

  /** احفظ الداتا بعد merge أو view-details.
   * تقبل داتا بسيطة (name/email/phone/… أو customerCode) وهانحوّلها تلقائيًا للشكل الكامل.
   */
  setData(master: any, duplicates: any[] = []) {
    const enrichedMaster = this.enrichMaster(master);
    const goldenCode = enrichedMaster.goldenCode;

    this._master = enrichedMaster;
    this._duplicates = (duplicates || []).map(d => this.enrichDuplicate(d, goldenCode));
  }

  /** رجّع الماستر (ولو مش متسجّل، رجّع fallback كاملة) */
  getMaster(): GoldenMasterFull {
    return this._master ?? this.getFallbackMaster();
  }

  /** رجّع الدوبلكيتس (ولو فاضي، رجّع fallback أمثلة) */
  getDuplicates(): DuplicateRow[] {
    return (this._duplicates && this._duplicates.length) ? this._duplicates : this.getFallbackDuplicates();
  }

  /** مسح المخزن */
  reset() {
    this._master = null;
    this._duplicates = [];
  }

  // =============== Helpers ===============

  /** تحويل أي داتا جاية (بسيطة أو كاملة) إلى GoldenMasterFull */
  private enrichMaster(src: any): GoldenMasterFull {
    if (!src) src = {};

    const goldenCode = src.goldenCode || this.generateGoldenCode();
    const oldCode    = src.oldCode || src.customerCode || 'C0001001';

    // لو جت داتا من duplicate-customer: name/email/phone/address/country/taxNumber/salesOrg/division
    const companyName  = src.companyName || src.name || 'Company Name';
    const email        = src.email || 'contact@example.com';
    const phone        = src.phone || '02-0000-0000';
    const address      = src.address || 'Street, City';
    const country      = src.country || 'Egypt';
    const taxNumber    = src.taxNumber || 'EG0000000000';
    const salesOrg     = src.salesOrg || 'HSA Egypt – Local';
    const division     = src.division || 'FMCG';

    // حقول إضافية للفورم: بنحط قيم dummy كويسة للعرض
    return {
      goldenCode,
      oldCode,
      companyName,
      companyNameAr: src.companyNameAr || companyName, // ممكن تضيف ترجمة بعدين
      customerType: src.customerType || 'limited_liability',
      ownerFullName: src.ownerFullName || 'Owner Name',
      taxNumber,
      streetName: src.streetName || (address.split(',')[0] || 'Main St'),
      buildingNumber: src.buildingNumber || 'Bldg 1',
      city: src.city || (address.split(',')[1]?.trim() || 'Cairo'),
      country,

      contactName: src.contactName || 'Contact Person',
      jobTitle: src.jobTitle || 'Manager',
      email,
      mobile: src.mobile || '0100-000-0000',
      landline: phone,
      preferredLanguage: src.preferredLanguage || 'English',

      commercialRegistrationDoc: src.commercialRegistrationDoc || 'CommercialRegistration.pdf',
      taxCertificateDoc: src.taxCertificateDoc || 'TaxCertificate.pdf',

      salesOrg,
      distributionChannel: src.distributionChannel || '03',
      division
    };
  }

  /** توحيد صف الدوبلكيت */
  private enrichDuplicate(d: any, goldenCode: string): DuplicateRow {
    if (!d) d = {};
    return {
      oldCode: d.oldCode || d.customerCode || 'C0000000',
      goldenCode: d.goldenCode || goldenCode,
      name: d.name || 'Duplicate Name',
      email: d.email || 'dup@example.com',
      phone: d.phone || '02-0000-0000',
      address: d.address || 'Street, City',
      country: d.country || 'Egypt',
      taxNumber: d.taxNumber || 'EG0000000000',
      salesOrg: d.salesOrg || 'HSA Egypt – Local',
      division: d.division || 'FMCG'
    };
  }

  /** كود جولدن بسيط */
  private generateGoldenCode(): string {
    const n = Math.floor(1000 + Math.random() * 9000); // 4 digits
    return `G000${n}`;
    // لو حبيت تبني Counter عالمي أو seed، ممكن تستخدم localStorage هنا
  }

  /** Fallback جاهز وكامل للماستر */
  private getFallbackMaster(): GoldenMasterFull {
    return {
      goldenCode: 'G0002709',
      oldCode: 'C0001001',
      companyName: 'Nestlé Egypt',
      companyNameAr: 'نستله مصر',
      customerType: 'limited_liability',
      ownerFullName: 'Ahmed Mostafa',
      taxNumber: 'EG1122334455',
      streetName: '123 Nile St',
      buildingNumber: 'Bldg 5',
      city: 'Giza',
      country: 'Egypt',

      contactName: 'Mona ElSayed',
      jobTitle: 'Procurement Manager',
      email: 'contact@eg.nestle.com',
      mobile: '0100-555-7788',
      landline: '02-2465-1000',
      preferredLanguage: 'English',

      commercialRegistrationDoc: 'CommercialRegistration.pdf',
      taxCertificateDoc: 'TaxCertificate.pdf',

      salesOrg: 'HSA Egypt – Local',
      distributionChannel: '03',
      division: 'FMCG'
    };
  }

  /** Fallback أمثلة للدوبلكيتس */
  private getFallbackDuplicates(): DuplicateRow[] {
    return [
      {
        oldCode: 'C0001002',
        goldenCode: 'G0002709',
        name: 'Nestle Egypt S.A.E',
        email: 'info@nestle-eg.com',
        phone: '02-2465-2000',
        address: '29 Corniche El-Nil, Maadi, Cairo',
        country: 'Egypt',
        taxNumber: 'EG1122334455',
        salesOrg: 'HSA Egypt – Local',
        division: 'FMCG'
      },
      {
        oldCode: 'C0001003',
        goldenCode: 'G0002709',
        name: 'Nestlé Egypt Ltd.',
        email: 'customer.service@nestle.com',
        phone: '02-2465-3000',
        address: 'Smart Village, 6-Oct',
        country: 'Egypt',
        taxNumber: 'EG1122334455',
        salesOrg: 'HSA Egypt – Local',
        division: 'FMCG'
      }
    ];
  }

    constructor() {
    }
}