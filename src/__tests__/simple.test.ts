describe('Simple Test', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should import types', () => {
    const { CamProps } = require('../types');
    expect(CamProps).toBeUndefined(); // Type, not a value
  });
});