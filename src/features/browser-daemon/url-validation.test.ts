import { describe, it, expect } from 'vitest';
import { validateNavigationUrl } from './url-validation.ts';

describe('validateNavigationUrl', () => {
  it('allows valid http URLs', () => {
    expect(() => validateNavigationUrl('http://example.com')).not.toThrow();
    expect(() => validateNavigationUrl('http://localhost:3000')).not.toThrow();
    expect(() => validateNavigationUrl('http://192.168.1.1/path')).not.toThrow();
  });

  it('allows valid https URLs', () => {
    expect(() => validateNavigationUrl('https://example.com')).not.toThrow();
    expect(() => validateNavigationUrl('https://example.com/path?q=1#hash')).not.toThrow();
    expect(() => validateNavigationUrl('https://sub.domain.example.com')).not.toThrow();
  });

  it('blocks file:// URLs', () => {
    expect(() => validateNavigationUrl('file:///etc/passwd')).toThrow();
    expect(() => validateNavigationUrl('file://localhost/c:/WINDOWS')).toThrow();
  });

  it('blocks ftp:// URLs', () => {
    expect(() => validateNavigationUrl('ftp://example.com')).toThrow();
  });

  it('blocks javascript: URLs', () => {
    expect(() => validateNavigationUrl('javascript:alert(1)')).toThrow();
    expect(() => validateNavigationUrl('javascript:void(0)')).toThrow();
  });

  it('blocks data: URLs', () => {
    expect(() => validateNavigationUrl('data:text/html,<h1>hi</h1>')).toThrow();
  });

  it('blocks AWS metadata IP (169.254.169.254)', () => {
    expect(() => validateNavigationUrl('http://169.254.169.254/latest/meta-data/')).toThrow();
    expect(() => validateNavigationUrl('http://169.254.169.254')).toThrow();
  });

  it('blocks GCP metadata IP (metadata.google.internal)', () => {
    expect(() => validateNavigationUrl('http://metadata.google.internal/')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => validateNavigationUrl('')).toThrow();
  });

  it('throws on non-URL strings', () => {
    expect(() => validateNavigationUrl('not-a-url')).toThrow();
    expect(() => validateNavigationUrl('example.com')).toThrow();
  });
});
