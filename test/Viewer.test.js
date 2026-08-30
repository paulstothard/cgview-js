import Viewer from '../src/Viewer';
import { PluginsStandard } from '../src/Plugins';
import utils from '../src/Utils';

const createTestPlugin = (overrides = {}) => ({
  name: 'TestPlugin',
  id: 'pluginTest',
  version: '0.1.0',
  type: 'General',
  ...overrides,
});

describe('Viewer', () => {

  beforeEach(() => {
    // Set up document body to have a div for the map
    document.body.innerHTML = '<div id="map"></div>';
  });

  test('can be created', () => {
    const cgv = new Viewer('#map');
    expect(cgv.features().length).toBe(0);
  });

  test('can be created with a feature', () => {
    const feature = {start: 100, stop: 200};
    const cgv = new Viewer('#map', {features: [feature]});
    expect(cgv.features().length).toBe(1);
  });

  test('redraws two animation frames after zoom settles in Safari', () => {
    const cgv = new Viewer('#map');
    const callbacks = [];
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    window.requestAnimationFrame = jest.fn(callback => {
      callbacks.push(callback);
      return callbacks.length;
    });
    window.cancelAnimationFrame = jest.fn();
    const safari = jest.spyOn(utils, 'isSafari').mockReturnValue(true);
    const drawFull = jest.spyOn(cgv, 'drawFull');

    try {
      cgv._scheduleSafariZoomRedraw();
      expect(drawFull).not.toHaveBeenCalled();
      expect(callbacks).toHaveLength(1);

      callbacks[0]();
      expect(drawFull).not.toHaveBeenCalled();
      expect(callbacks).toHaveLength(2);

      callbacks[1]();
      expect(drawFull).toHaveBeenCalledTimes(1);
      expect(cgv._safariZoomRedrawFrame).toBeUndefined();
    } finally {
      safari.mockRestore();
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  test('does not schedule the post-zoom redraw outside Safari', () => {
    const cgv = new Viewer('#map');
    const requestAnimationFrame = jest.spyOn(window, 'requestAnimationFrame');
    const safari = jest.spyOn(utils, 'isSafari').mockReturnValue(false);

    try {
      cgv._scheduleSafariZoomRedraw();
      expect(requestAnimationFrame).not.toHaveBeenCalled();
    } finally {
      safari.mockRestore();
      requestAnimationFrame.mockRestore();
    }
  });

  describe('plugins option', () => {

    test('installs a single custom plugin', () => {
      const plugin = createTestPlugin();
      const cgv = new Viewer('#map', {plugins: plugin});

      expect(cgv.plugins.includes(plugin.id)).toBe(true);
    });

    test('installs multiple custom plugins', () => {
      const plugins = [
        createTestPlugin({name: 'FirstPlugin', id: 'pluginFirst'}),
        createTestPlugin({name: 'SecondPlugin', id: 'pluginSecond'}),
      ];
      const cgv = new Viewer('#map', {plugins});

      plugins.forEach(plugin => {
        expect(cgv.plugins.includes(plugin.id)).toBe(true);
      });
    });

    test('keeps standard plugins installed', () => {
      const plugin = createTestPlugin();
      const cgv = new Viewer('#map', {plugins: plugin});

      PluginsStandard.forEach(standardPlugin => {
        expect(cgv.plugins.includes(standardPlugin.id)).toBe(true);
      });
    });

    test('passes the Viewer to install', () => {
      const install = jest.fn();
      const plugin = createTestPlugin({install});
      const cgv = new Viewer('#map', {plugins: plugin});

      expect(install).toHaveBeenCalledTimes(1);
      expect(install).toHaveBeenCalledWith(cgv);
    });

    test('installs standard plugins before custom plugins in the supplied order', () => {
      const installationOrder = [];
      let standardsInstalledBeforeCustom;
      const plugins = [
        createTestPlugin({
          name: 'FirstPlugin',
          id: 'pluginFirst',
          install(cgv) {
            standardsInstalledBeforeCustom = PluginsStandard.every(plugin =>
              cgv.plugins.includes(plugin.id)
            );
            installationOrder.push('pluginFirst');
          },
        }),
        createTestPlugin({
          name: 'SecondPlugin',
          id: 'pluginSecond',
          install() {
            installationOrder.push('pluginSecond');
          },
        }),
      ];

      new Viewer('#map', {plugins});

      expect(standardsInstalledBeforeCustom).toBe(true);
      expect(installationOrder).toEqual(plugins.map(plugin => plugin.id));
    });

    test('rejects a custom plugin with a standard plugin ID', () => {
      const install = jest.fn();
      const plugin = createTestPlugin({
        name: 'DuplicateStandardPlugin',
        id: PluginsStandard[0].id,
        install,
      });

      expect(() => new Viewer('#map', {plugins: plugin}))
        .toThrow(`Plugin '${plugin.id}' is already installed.`);
      expect(install).not.toHaveBeenCalled();
    });

  });

});
