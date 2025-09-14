
import { Role } from './models';
import { Injectable } from '@angular/core';
import { Router } from "@angular/router";

@Injectable({ providedIn: 'root' })
export class RoleService {
  // توافق مع userType القديم (1/2/3)
  private mapNumToRole: Record<string, Role> = {
    '1': 'DATA_ENTRY',
    '2': 'MASTER',
    '3': 'COMPLIANCE'
  };

  private mapRoleToNum: Record<Role, string> = {
    DATA_ENTRY: '1',
    MASTER: '2',
    COMPLIANCE: '3'
  };

  /** اضبط الدور بشكل صريح */
  setRole(role: Role): void {
    localStorage.setItem('role', role);
    localStorage.setItem('user', this.mapRoleToNum[role]); // توافق قديم
  }

  /** اضبط الدور بناءً على userType=1/2/3 (لو لسه بتستقبل الرقم من اللوجين) */
  setFromUserType(userType: string): void {
    const role = this.mapNumToRole[userType] || 'DATA_ENTRY';
    this.setRole(role);
  }

  /** رجّع الدور الحالي (افتراضي DATA_ENTRY لو فاضي/قيمة غلط) */
  getRole(): Role {
    const raw = localStorage.getItem('role') as Role | null;
    if (raw === 'DATA_ENTRY' || raw === 'MASTER' || raw === 'COMPLIANCE') return raw;
    // fallback لتوافق userType القديم
    const num = localStorage.getItem('user') || '1';
    const role = this.mapNumToRole[num] || 'DATA_ENTRY';
    // ثبّت القيم المعيارية
    this.setRole(role);
    return role;
  }

  /** رجّع userType كرقم (توافق قديم) */
  getUserTypeNumber(): string {
    return localStorage.getItem('user') || this.mapRoleToNum[this.getRole()];
  }

  /** هل الدور الحالي يساوي role؟ */
  is(role: Role): boolean {
    return this.getRole() === role;
  }

  /** امسح الدور المخزّن (مثلاً عند تسجيل الخروج) */
  clear(): void {
    localStorage.removeItem('role');
    localStorage.removeItem('user');
  }

  /** للعرض السريع */
  get currentRole(): Role {
    return this.getRole();
  }
  get currentRoleNumber(): string {
    return this.getUserTypeNumber();
  }

    constructor() {
    }
}