!function(t){"use strict";function e(t){if("string"!=typeof t&&(t=String(t)),/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(t))throw new TypeError("Invalid character in header field name");return t.toLowerCase()}function r(t){return"string"!=typeof t&&(t=String(t)),t}function n(t){var e={next:function(){var e=t.shift();return{done:void 0===e,value:e}}};return y.iterable&&(e[Symbol.iterator]=function(){return e}),e}function o(t){this.map={},t instanceof o?t.forEach(function(t,e){this.append(e,t)},this):t&&Object.getOwnPropertyNames(t).forEach(function(e){this.append(e,t[e])},this)}function i(t){return t.bodyUsed?Promise.reject(new TypeError("Already read")):void(t.bodyUsed=!0)}function s(t){return new Promise(function(e,r){t.onload=function(){e(t.result)},t.onerror=function(){r(t.error)}})}function u(t){var e=new FileReader;return e.readAsArrayBuffer(t),s(e)}function a(t){var e=new FileReader;return e.readAsText(t),s(e)}function c(){return this.bodyUsed=!1,this._initBody=function(t){if(this._bodyInit=t,"string"==typeof t)this._bodyText=t;else if(y.blob&&Blob.prototype.isPrototypeOf(t))this._bodyBlob=t;else if(y.formData&&FormData.prototype.isPrototypeOf(t))this._bodyFormData=t;else if(y.searchParams&&URLSearchParams.prototype.isPrototypeOf(t))this._bodyText=t.toString();else if(t){if(!y.arrayBuffer||!ArrayBuffer.prototype.isPrototypeOf(t))throw new Error("unsupported BodyInit type")}else this._bodyText="";this.headers.get("content-type")||("string"==typeof t?this.headers.set("content-type","text/plain;charset=UTF-8"):this._bodyBlob&&this._bodyBlob.type?this.headers.set("content-type",this._bodyBlob.type):y.searchParams&&URLSearchParams.prototype.isPrototypeOf(t)&&this.headers.set("content-type","application/x-www-form-urlencoded;charset=UTF-8"))},y.blob?(this.blob=function(){var t=i(this);if(t)return t;if(this._bodyBlob)return Promise.resolve(this._bodyBlob);if(this._bodyFormData)throw new Error("could not read FormData body as blob");return Promise.resolve(new Blob([this._bodyText]))},this.arrayBuffer=function(){return this.blob().then(u)},this.text=function(){var t=i(this);if(t)return t;if(this._bodyBlob)return a(this._bodyBlob);if(this._bodyFormData)throw new Error("could not read FormData body as text");return Promise.resolve(this._bodyText)}):this.text=function(){var t=i(this);return t?t:Promise.resolve(this._bodyText)},y.formData&&(this.formData=function(){return this.text().then(l)}),this.json=function(){return this.text().then(JSON.parse)},this}function f(t){var e=t.toUpperCase();return m.indexOf(e)>-1?e:t}function h(t,e){e=e||{};var r=e.body;if(h.prototype.isPrototypeOf(t)){if(t.bodyUsed)throw new TypeError("Already read");this.url=t.url,this.credentials=t.credentials,e.headers||(this.headers=new o(t.headers)),this.method=t.method,this.mode=t.mode,r||(r=t._bodyInit,t.bodyUsed=!0)}else this.url=t;if(this.credentials=e.credentials||this.credentials||"omit",!e.headers&&this.headers||(this.headers=new o(e.headers)),this.method=f(e.method||this.method||"GET"),this.mode=e.mode||this.mode||null,this.referrer=null,("GET"===this.method||"HEAD"===this.method)&&r)throw new TypeError("Body not allowed for GET or HEAD requests");this._initBody(r)}function l(t){var e=new FormData;return t.trim().split("&").forEach(function(t){if(t){var r=t.split("="),n=r.shift().replace(/\+/g," "),o=r.join("=").replace(/\+/g," ");e.append(decodeURIComponent(n),decodeURIComponent(o))}}),e}function p(t){var e=new o,r=(t.getAllResponseHeaders()||"").trim().split("\n");return r.forEach(function(t){var r=t.trim().split(":"),n=r.shift().trim(),o=r.join(":").trim();e.append(n,o)}),e}function d(t,e){e||(e={}),this.type="default",this.status=e.status,this.ok=this.status>=200&&this.status<300,this.statusText=e.statusText,this.headers=e.headers instanceof o?e.headers:new o(e.headers),this.url=e.url||"",this._initBody(t)}if(!t.fetch){var y={searchParams:"URLSearchParams"in t,iterable:"Symbol"in t&&"iterator"in Symbol,blob:"FileReader"in t&&"Blob"in t&&function(){try{return new Blob,!0}catch(t){return!1}}(),formData:"FormData"in t,arrayBuffer:"ArrayBuffer"in t};o.prototype.append=function(t,n){t=e(t),n=r(n);var o=this.map[t];o||(o=[],this.map[t]=o),o.push(n)},o.prototype["delete"]=function(t){delete this.map[e(t)]},o.prototype.get=function(t){var r=this.map[e(t)];return r?r[0]:null},o.prototype.getAll=function(t){return this.map[e(t)]||[]},o.prototype.has=function(t){return this.map.hasOwnProperty(e(t))},o.prototype.set=function(t,n){this.map[e(t)]=[r(n)]},o.prototype.forEach=function(t,e){Object.getOwnPropertyNames(this.map).forEach(function(r){this.map[r].forEach(function(n){t.call(e,n,r,this)},this)},this)},o.prototype.keys=function(){var t=[];return this.forEach(function(e,r){t.push(r)}),n(t)},o.prototype.values=function(){var t=[];return this.forEach(function(e){t.push(e)}),n(t)},o.prototype.entries=function(){var t=[];return this.forEach(function(e,r){t.push([r,e])}),n(t)},y.iterable&&(o.prototype[Symbol.iterator]=o.prototype.entries);var m=["DELETE","GET","HEAD","OPTIONS","POST","PUT"];h.prototype.clone=function(){return new h(this)},c.call(h.prototype),c.call(d.prototype),d.prototype.clone=function(){return new d(this._bodyInit,{status:this.status,statusText:this.statusText,headers:new o(this.headers),url:this.url})},d.error=function(){var t=new d(null,{status:0,statusText:""});return t.type="error",t};var v=[301,302,303,307,308];d.redirect=function(t,e){if(v.indexOf(e)===-1)throw new RangeError("Invalid status code");return new d(null,{status:e,headers:{location:t}})},t.Headers=o,t.Request=h,t.Response=d,t.fetch=function(t,e){return new Promise(function(r,n){function o(){return"responseURL"in s?s.responseURL:/^X-Request-URL:/m.test(s.getAllResponseHeaders())?s.getResponseHeader("X-Request-URL"):void 0}var i;i=h.prototype.isPrototypeOf(t)&&!e?t:new h(t,e);var s=new XMLHttpRequest;s.onload=function(){var t={status:s.status,statusText:s.statusText,headers:p(s),url:o()},e="response"in s?s.response:s.responseText;r(new d(e,t))},s.onerror=function(){n(new TypeError("Network request failed"))},s.ontimeout=function(){n(new TypeError("Network request failed"))},s.open(i.method,i.url,!0),"include"===i.credentials&&(s.withCredentials=!0),"responseType"in s&&y.blob&&(s.responseType="blob"),i.headers.forEach(function(t,e){s.setRequestHeader(e,t)}),s.send("undefined"==typeof i._bodyInit?null:i._bodyInit)})},t.fetch.polyfill=!0}}("undefined"!=typeof self?self:this),function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):t.ES6Promise=e()}(this,function(){"use strict";function t(t){return"function"==typeof t||"object"==typeof t&&null!==t}function e(t){return"function"==typeof t}function r(t){z=t}function n(t){J=t}function o(){return function(){return process.nextTick(c)}}function i(){return"undefined"!=typeof Y?function(){Y(c)}:a()}function s(){var t=0,e=new $(c),r=document.createTextNode("");return e.observe(r,{characterData:!0}),function(){r.data=t=++t%2}}function u(){var t=new MessageChannel;return t.port1.onmessage=c,function(){return t.port2.postMessage(0)}}function a(){var t=setTimeout;return function(){return t(c,1)}}function c(){for(var t=0;t<X;t+=2){var e=Z[t],r=Z[t+1];e(r),Z[t]=void 0,Z[t+1]=void 0}X=0}function f(){try{var t=require,e=t("vertx");return Y=e.runOnLoop||e.runOnContext,i()}catch(r){return a()}}function h(t,e){var r=arguments,n=this,o=new this.constructor(p);void 0===o[et]&&j(o);var i=n._state;return i?!function(){var t=r[i-1];J(function(){return B(i,o,t,n._result)})}():P(n,o,t,e),o}function l(t){var e=this;if(t&&"object"==typeof t&&t.constructor===e)return t;var r=new e(p);return g(r,t),r}function p(){}function d(){return new TypeError("You cannot resolve a promise with itself")}function y(){return new TypeError("A promises callback cannot return that same promise.")}function m(t){try{return t.then}catch(e){return it.error=e,it}}function v(t,e,r,n){try{t.call(e,r,n)}catch(o){return o}}function b(t,e,r){J(function(t){var n=!1,o=v(r,e,function(r){n||(n=!0,e!==r?g(t,r):T(t,r))},function(e){n||(n=!0,A(t,e))},"Settle: "+(t._label||" unknown promise"));!n&&o&&(n=!0,A(t,o))},t)}function _(t,e){e._state===nt?T(t,e._result):e._state===ot?A(t,e._result):P(e,void 0,function(e){return g(t,e)},function(e){return A(t,e)})}function w(t,r,n){r.constructor===t.constructor&&n===h&&r.constructor.resolve===l?_(t,r):n===it?A(t,it.error):void 0===n?T(t,r):e(n)?b(t,r,n):T(t,r)}function g(e,r){e===r?A(e,d()):t(r)?w(e,r,m(r)):T(e,r)}function E(t){t._onerror&&t._onerror(t._result),x(t)}function T(t,e){t._state===rt&&(t._result=e,t._state=nt,0!==t._subscribers.length&&J(x,t))}function A(t,e){t._state===rt&&(t._state=ot,t._result=e,J(E,t))}function P(t,e,r,n){var o=t._subscribers,i=o.length;t._onerror=null,o[i]=e,o[i+nt]=r,o[i+ot]=n,0===i&&t._state&&J(x,t)}function x(t){var e=t._subscribers,r=t._state;if(0!==e.length){for(var n=void 0,o=void 0,i=t._result,s=0;s<e.length;s+=3)n=e[s],o=e[s+r],n?B(r,n,o,i):o(i);t._subscribers.length=0}}function S(){this.error=null}function O(t,e){try{return t(e)}catch(r){return st.error=r,st}}function B(t,r,n,o){var i=e(n),s=void 0,u=void 0,a=void 0,c=void 0;if(i){if(s=O(n,o),s===st?(c=!0,u=s.error,s=null):a=!0,r===s)return void A(r,y())}else s=o,a=!0;r._state!==rt||(i&&a?g(r,s):c?A(r,u):t===nt?T(r,s):t===ot&&A(r,s))}function R(t,e){try{e(function(e){g(t,e)},function(e){A(t,e)})}catch(r){A(t,r)}}function U(){return ut++}function j(t){t[et]=ut++,t._state=void 0,t._result=void 0,t._subscribers=[]}function D(t,e){this._instanceConstructor=t,this.promise=new t(p),this.promise[et]||j(this.promise),G(e)?(this._input=e,this.length=e.length,this._remaining=e.length,this._result=new Array(this.length),0===this.length?T(this.promise,this._result):(this.length=this.length||0,this._enumerate(),0===this._remaining&&T(this.promise,this._result))):A(this.promise,F())}function F(){return new Error("Array Methods must be provided an Array")}function C(t){return new D(this,t).promise}function I(t){var e=this;return new e(G(t)?function(r,n){for(var o=t.length,i=0;i<o;i++)e.resolve(t[i]).then(r,n)}:function(t,e){return e(new TypeError("You must pass an array to race."))})}function L(t){var e=this,r=new e(p);return A(r,t),r}function q(){throw new TypeError("You must pass a resolver function as the first argument to the promise constructor")}function H(){throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.")}function M(t){this[et]=U(),this._result=this._state=void 0,this._subscribers=[],p!==t&&("function"!=typeof t&&q(),this instanceof M?R(this,t):H())}function k(){var t=void 0;if("undefined"!=typeof global)t=global;else if("undefined"!=typeof self)t=self;else try{t=Function("return this")()}catch(e){throw new Error("polyfill failed because global object is unavailable in this environment")}var r=t.Promise;if(r){var n=null;try{n=Object.prototype.toString.call(r.resolve())}catch(e){}if("[object Promise]"===n&&!r.cast)return}t.Promise=M}var N=void 0;N=Array.isArray?Array.isArray:function(t){return"[object Array]"===Object.prototype.toString.call(t)};var G=N,X=0,Y=void 0,z=void 0,J=function(t,e){Z[X]=t,Z[X+1]=e,X+=2,2===X&&(z?z(c):tt())},K="undefined"!=typeof window?window:void 0,W=K||{},$=W.MutationObserver||W.WebKitMutationObserver,Q="undefined"==typeof self&&"undefined"!=typeof process&&"[object process]"==={}.toString.call(process),V="undefined"!=typeof Uint8ClampedArray&&"undefined"!=typeof importScripts&&"undefined"!=typeof MessageChannel,Z=new Array(1e3),tt=void 0;tt=Q?o():$?s():V?u():void 0===K&&"function"==typeof require?f():a();var et=Math.random().toString(36).substring(16),rt=void 0,nt=1,ot=2,it=new S,st=new S,ut=0;return D.prototype._enumerate=function(){for(var t=this.length,e=this._input,r=0;this._state===rt&&r<t;r++)this._eachEntry(e[r],r)},D.prototype._eachEntry=function(t,e){var r=this._instanceConstructor,n=r.resolve;if(n===l){var o=m(t);if(o===h&&t._state!==rt)this._settledAt(t._state,e,t._result);else if("function"!=typeof o)this._remaining--,this._result[e]=t;else if(r===M){var i=new r(p);w(i,t,o),this._willSettleAt(i,e)}else this._willSettleAt(new r(function(e){return e(t)}),e)}else this._willSettleAt(n(t),e)},D.prototype._settledAt=function(t,e,r){var n=this.promise;n._state===rt&&(this._remaining--,t===ot?A(n,r):this._result[e]=r),0===this._remaining&&T(n,this._result)},D.prototype._willSettleAt=function(t,e){var r=this;P(t,void 0,function(t){return r._settledAt(nt,e,t)},function(t){return r._settledAt(ot,e,t)})},M.all=C,M.race=I,M.resolve=l,M.reject=L,M._setScheduler=r,M._setAsap=n,M._asap=J,M.prototype={constructor:M,then:h,"catch":function(t){return this.then(null,t)}},M.polyfill=k,M.Promise=M,M});