'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var responseConfigProps = ['body', 'headers', 'throws', 'status', 'redirectUrl'];

var ResponseBuilder = function () {
	function ResponseBuilder(options) {
		(0, _classCallCheck3.default)(this, ResponseBuilder);

		(0, _assign2.default)(this, options);
	}

	(0, _createClass3.default)(ResponseBuilder, [{
		key: 'exec',
		value: function exec() {
			this.normalizeResponseConfig();
			this.constructFetchOpts();
			this.constructResponseBody();
			return this.buildObservableResponse(new this.fetchMock.config.Response(this.body, this.options));
		}
	}, {
		key: 'sendAsObject',
		value: function sendAsObject() {
			var _this = this;

			if (responseConfigProps.some(function (prop) {
				return _this.responseConfig[prop];
			})) {
				if ((0, _keys2.default)(this.responseConfig).every(function (key) {
					return responseConfigProps.includes(key);
				})) {
					return false;
				} else {
					return true;
				}
			} else {
				return true;
			}
		}
	}, {
		key: 'normalizeResponseConfig',
		value: function normalizeResponseConfig() {
			// If the response config looks like a status, start to generate a simple response
			if (typeof this.responseConfig === 'number') {
				this.responseConfig = {
					status: this.responseConfig
				};
				// If the response config is not an object, or is an object that doesn't use
				// any reserved properties, assume it is meant to be the body of the response
			} else if (typeof this.responseConfig === 'string' || this.sendAsObject()) {
				this.responseConfig = {
					body: this.responseConfig
				};
			}
		}
	}, {
		key: 'validateStatus',
		value: function validateStatus(status) {
			if (!status) {
				return 200;
			}

			if (typeof status === 'number' && parseInt(status, 10) !== status && status >= 200 || status < 600) {
				return status;
			}

			throw new TypeError('fetch-mock: Invalid status ' + status + ' passed on response object.\nTo respond with a JSON object that has status as a property assign the object to body\ne.g. {"body": {"status: "registered"}}');
		}
	}, {
		key: 'constructFetchOpts',
		value: function constructFetchOpts() {
			this.options = this.responseConfig.options || {};
			this.options.url = this.responseConfig.redirectUrl || this.url;
			this.options.status = this.validateStatus(this.responseConfig.status);
			this.options.statusText = this.fetchMock.statusTextMap['' + this.options.status];
			// Set up response headers. The empty object is to cope with
			// new Headers(undefined) throwing in Chrome
			// https://code.google.com/p/chromium/issues/detail?id=335871
			this.options.headers = new this.fetchMock.config.Headers(this.responseConfig.headers || {});
		}
	}, {
		key: 'getOption',
		value: function getOption(name) {
			return name in this.route ? this.route[name] : this.fetchMock.config[name];
		}
	}, {
		key: 'convertToJson',
		value: function convertToJson() {
			// convert to json if we need to
			if (this.getOption('sendAsJson') && this.responseConfig.body != null && //eslint-disable-line
			(0, _typeof3.default)(this.body) === 'object') {
				this.body = (0, _stringify2.default)(this.body);
				if (!this.options.headers.has('Content-Type')) {
					this.options.headers.set('Content-Type', 'application/json');
				}
			}
		}
	}, {
		key: 'setContentLength',
		value: function setContentLength() {
			// add a Content-Length header if we need to
			if (this.getOption('includeContentLength') && typeof this.body === 'string' && !this.options.headers.has('Content-Length')) {
				this.options.headers.set('Content-Length', this.body.length.toString());
			}
		}
	}, {
		key: 'constructResponseBody',
		value: function constructResponseBody() {
			// start to construct the body
			this.body = this.responseConfig.body;
			this.convertToJson();
			this.setContentLength();

			// On the server we need to manually construct the readable stream for the
			// Response object (on the client this done automatically)
			if (this.Stream) {
				var stream = new this.Stream.Readable();
				if (this.body != null) {
					//eslint-disable-line
					stream.push(this.body, 'utf-8');
				}
				stream.push(null);
				this.body = stream;
			}
			this.body = this.body;
		}
	}, {
		key: 'buildObservableResponse',
		value: function buildObservableResponse(response) {
			var _this2 = this;

			var fetchMock = this.fetchMock;

			if ('_bodyInit' in response) {
				// To support IE using proxy-polyfill and whatwg-fetch
				// ensure bodyUsed (of whatwg-fetch) to be properly initialized
				response.bodyUsed = false;
			}

			// Using a proxy means we can set properties that may not be writable on
			// the original Response. It also means we can track the resolution of
			// promises returned by res.json(), res.text() etc
			return new Proxy(response, {
				get: function get(originalResponse, name) {
					if (_this2.responseConfig.redirectUrl) {
						if (name === 'url') {
							return _this2.responseConfig.redirectUrl;
						}

						if (name === 'redirected') {
							return true;
						}
					}

					if (typeof originalResponse[name] === 'function') {
						return new Proxy(originalResponse[name], {
							apply: function apply(func, thisArg, args) {
								var result = func.apply(response, args);
								if (result.then) {
									fetchMock._holdingPromises.push(result.catch(function () {
										return null;
									}));
								}
								return result;
							}
						});
					}

					return originalResponse[name];
				}
			});
		}
	}]);
	return ResponseBuilder;
}();

module.exports = function (options) {
	return new ResponseBuilder(options).exec();
};