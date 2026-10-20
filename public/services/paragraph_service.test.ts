/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParagraphService, ParagraphRegistryItem } from './paragraph_service';
import { OTHER_PARAGRAPH_TYPE } from '../../common/constants/notebooks';

describe('ParagraphService', () => {
  let service: ParagraphService;

  beforeEach(() => {
    service = new ParagraphService();
  });

  describe('setup', () => {
    it('should return register and getParagraphRegistry methods', () => {
      const setup = service.setup();

      expect(setup.register).toBeDefined();
      expect(typeof setup.register).toBe('function');
      expect(setup.getParagraphRegistry).toBeDefined();
      expect(typeof setup.getParagraphRegistry).toBe('function');
    });
  });

  describe('register', () => {
    it('should register a paragraph type', () => {
      const setup = service.setup();
      const mockParagraph: ParagraphRegistryItem = {
        ParagraphComponent: jest.fn() as any,
        runParagraph: jest.fn(),
      };

      setup.register('test-type', mockParagraph);

      const retrieved = setup.getParagraphRegistry('test-type');
      expect(retrieved).toBe(mockParagraph);
    });

    it('should register multiple paragraph types at once', () => {
      const setup = service.setup();
      const mockParagraph: ParagraphRegistryItem = {
        ParagraphComponent: jest.fn() as any,
        runParagraph: jest.fn(),
      };

      setup.register(['type1', 'type2', 'type3'], mockParagraph);

      expect(setup.getParagraphRegistry('type1')).toBe(mockParagraph);
      expect(setup.getParagraphRegistry('type2')).toBe(mockParagraph);
      expect(setup.getParagraphRegistry('type3')).toBe(mockParagraph);
    });

    it('should log error when registering duplicate type', () => {
      const setup = service.setup();
      const mockParagraph1: ParagraphRegistryItem = {
        ParagraphComponent: jest.fn() as any,
        runParagraph: jest.fn(),
      };
      const mockParagraph2: ParagraphRegistryItem = {
        ParagraphComponent: jest.fn() as any,
        runParagraph: jest.fn(),
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      setup.register('duplicate-type', mockParagraph1);
      setup.register('duplicate-type', mockParagraph2);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('paragraph type duplicate-type has already been registered')
      );

      // First registration should be kept
      expect(setup.getParagraphRegistry('duplicate-type')).toBe(mockParagraph1);

      consoleSpy.mockRestore();
    });

    it('should handle array with single type', () => {
      const setup = service.setup();
      const mockParagraph: ParagraphRegistryItem = {
        ParagraphComponent: jest.fn() as any,
        runParagraph: jest.fn(),
      };

      setup.register(['single-type'], mockParagraph);

      expect(setup.getParagraphRegistry('single-type')).toBe(mockParagraph);
    });

    it('should register paragraph with all properties', () => {
      const setup = service.setup();
      const mockParagraph: ParagraphRegistryItem = {
        ParagraphComponent: jest.fn() as any,
        getContext: jest.fn(),
        runParagraph: jest.fn(),
      };

      setup.register('full-type', mockParagraph);

      const retrieved = setup.getParagraphRegistry('full-type');
      expect(retrieved).toBe(mockParagraph);
      expect(retrieved?.ParagraphComponent).toBeDefined();
      expect(retrieved?.getContext).toBeDefined();
      expect(retrieved?.runParagraph).toBeDefined();
    });
  });

  describe('getParagraphRegistry', () => {
    it('should return undefined for unregistered type', () => {
      const setup = service.setup();

      const retrieved = setup.getParagraphRegistry('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should return registered paragraph', () => {
      const setup = service.setup();
      const mockParagraph: ParagraphRegistryItem = {
        ParagraphComponent: jest.fn() as any,
        runParagraph: jest.fn(),
      };

      setup.register('my-type', mockParagraph);

      expect(setup.getParagraphRegistry('my-type')).toBe(mockParagraph);
    });

    it('should return OTHER_PARAGRAPH_TYPE as fallback', () => {
      const setup = service.setup();
      const defaultParagraph: ParagraphRegistryItem = {
        ParagraphComponent: jest.fn() as any,
        runParagraph: jest.fn(),
      };

      setup.register(OTHER_PARAGRAPH_TYPE, defaultParagraph);

      // Request non-existent type should return default
      const retrieved = setup.getParagraphRegistry('unknown-type');
      expect(retrieved).toBe(defaultParagraph);
    });

    it('should return specific type over OTHER_PARAGRAPH_TYPE', () => {
      const setup = service.setup();
      const defaultParagraph: ParagraphRegistryItem = {
        ParagraphComponent: jest.fn() as any,
        runParagraph: jest.fn(),
      };
      const specificParagraph: ParagraphRegistryItem = {
        ParagraphComponent: jest.fn() as any,
        runParagraph: jest.fn(),
      };

      setup.register(OTHER_PARAGRAPH_TYPE, defaultParagraph);
      setup.register('specific-type', specificParagraph);

      expect(setup.getParagraphRegistry('specific-type')).toBe(specificParagraph);
      expect(setup.getParagraphRegistry('unknown-type')).toBe(defaultParagraph);
    });
  });

  describe('multiple setup calls', () => {
    it('should return consistent interface', () => {
      const setup1 = service.setup();
      const setup2 = service.setup();

      const mockParagraph: ParagraphRegistryItem = {
        ParagraphComponent: jest.fn() as any,
        runParagraph: jest.fn(),
      };

      setup1.register('test-type', mockParagraph);

      // Both setup instances should share the same registry
      expect(setup2.getParagraphRegistry('test-type')).toBe(mockParagraph);
    });
  });
});
