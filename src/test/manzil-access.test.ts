import { describe, expect, it } from 'vitest';
import { canAccessPage } from '@/lib/manzil/access';
describe('Preserved source role boundaries',()=>{
 it('keeps admin verification exclusive to super admins',()=>{
  expect(canAccessPage('admin-verification','super_admin')).toBe(true);
  expect(canAccessPage('admin-verification','buyer')).toBe(false);
  expect(canAccessPage('admin-verification',undefined)).toBe(false);
 });
 it('keeps society financials restricted to society and super admins',()=>{
  expect(canAccessPage('society-financials','society_admin')).toBe(true);
  expect(canAccessPage('society-financials','super_admin')).toBe(true);
  expect(canAccessPage('society-financials','dealer')).toBe(false);
 });
 it('retains buyer and super-admin booking access',()=>{
  expect(canAccessPage('book-plot','buyer')).toBe(true);
  expect(canAccessPage('book-plot','super_admin')).toBe(true);
  expect(canAccessPage('book-plot','dealer')).toBe(false);
 });
 it('keeps dealer analytics and buyer activity away from other roles (super admin sees all)',()=>{
  expect(canAccessPage('dealer-analytics','dealer')).toBe(true);
  expect(canAccessPage('dealer-analytics','buyer')).toBe(false);
  expect(canAccessPage('my-activity','buyer')).toBe(true);
  expect(canAccessPage('my-activity','dealer')).toBe(false);
 });
});