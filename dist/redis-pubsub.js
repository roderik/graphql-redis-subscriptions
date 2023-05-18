"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisPubSub = void 0;
var pubsub_async_iterator_1 = require("./pubsub-async-iterator");
var RedisPubSub = (function () {
    function RedisPubSub(options) {
        if (options === void 0) { options = {}; }
        var triggerTransform = options.triggerTransform, connection = options.connection, connectionListener = options.connectionListener, subscriber = options.subscriber, publisher = options.publisher, reviver = options.reviver, serializer = options.serializer, deserializer = options.deserializer, _a = options.messageEventName, messageEventName = _a === void 0 ? 'message' : _a, _b = options.pmessageEventName, pmessageEventName = _b === void 0 ? 'pmessage' : _b;
        this.triggerTransform = triggerTransform || (function (trigger) { return trigger; });
        if (reviver && deserializer) {
            throw new Error("Reviver and deserializer can't be used together");
        }
        this.reviver = reviver;
        this.serializer = serializer;
        this.deserializer = deserializer;
        if (subscriber && publisher) {
            this.redisPublisher = publisher;
            this.redisSubscriber = subscriber;
        }
        else {
            try {
                var IORedis = require('ioredis');
                this.redisPublisher = new IORedis(connection);
                this.redisSubscriber = new IORedis(connection);
                if (connectionListener) {
                    this.redisPublisher
                        .on('connect', connectionListener)
                        .on('error', connectionListener);
                    this.redisSubscriber
                        .on('connect', connectionListener)
                        .on('error', connectionListener);
                }
                else {
                    this.redisPublisher.on('error', console.error);
                    this.redisSubscriber.on('error', console.error);
                }
            }
            catch (error) {
                console.error("No publisher or subscriber instances were provided and the package 'ioredis' wasn't found. Couldn't create Redis clients.");
            }
        }
        this.redisSubscriber.on(pmessageEventName, this.onMessage.bind(this));
        this.redisSubscriber.on(messageEventName, this.onMessage.bind(this, undefined));
        this.subscriptionMap = {};
        this.subsRefsMap = new Map();
        this.subsPendingRefsMap = new Map();
        this.currentSubscriptionId = 0;
    }
    RedisPubSub.prototype.publish = function (trigger, payload) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.redisPublisher.publish(trigger, this.serializer ? this.serializer(payload) : JSON.stringify(payload))];
                    case 1:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    RedisPubSub.prototype.subscribe = function (trigger, onMessage, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var triggerName = this.triggerTransform(trigger, options);
        var id = this.currentSubscriptionId++;
        this.subscriptionMap[id] = [triggerName, onMessage];
        if (!this.subsRefsMap.has(triggerName)) {
            this.subsRefsMap.set(triggerName, new Set());
        }
        var refs = this.subsRefsMap.get(triggerName);
        var pendingRefs = this.subsPendingRefsMap.get(triggerName);
        if (pendingRefs != null) {
            pendingRefs.refs.push(id);
            return pendingRefs.pending.then(function () { return id; });
        }
        else if (refs.size > 0) {
            refs.add(id);
            return Promise.resolve(id);
        }
        else {
            var pending = new Deferred();
            var subsPendingRefsMap_1 = this.subsPendingRefsMap;
            subsPendingRefsMap_1.set(triggerName, { refs: [], pending: pending });
            var sub = new Promise(function (resolve, reject) {
                var subscribeFn = options['pattern'] ? _this.redisSubscriber.psubscribe : _this.redisSubscriber.subscribe;
                subscribeFn.call(_this.redisSubscriber, triggerName, function (err) {
                    if (err) {
                        subsPendingRefsMap_1.delete(triggerName);
                        reject(err);
                    }
                    else {
                        var pendingRefs_1 = subsPendingRefsMap_1.get(triggerName);
                        pendingRefs_1.refs.forEach(function (id) { return refs.add(id); });
                        subsPendingRefsMap_1.delete(triggerName);
                        refs.add(id);
                        resolve(id);
                    }
                });
            });
            sub.then(pending.resolve).catch(pending.reject);
            return sub;
        }
    };
    RedisPubSub.prototype.unsubscribe = function (subId) {
        var _a = (this.subscriptionMap[subId] || [])[0], triggerName = _a === void 0 ? null : _a;
        var refs = this.subsRefsMap.get(triggerName);
        if (!refs)
            throw new Error("There is no subscription of id \"".concat(subId, "\""));
        if (refs.size === 1) {
            this.redisSubscriber.unsubscribe(triggerName);
            this.redisSubscriber.punsubscribe(triggerName);
            this.subsRefsMap.delete(triggerName);
        }
        else {
            refs.delete(subId);
        }
        delete this.subscriptionMap[subId];
    };
    RedisPubSub.prototype.asyncIterator = function (triggers, options) {
        return new pubsub_async_iterator_1.PubSubAsyncIterator(this, triggers, options);
    };
    RedisPubSub.prototype.getSubscriber = function () {
        return this.redisSubscriber;
    };
    RedisPubSub.prototype.getPublisher = function () {
        return this.redisPublisher;
    };
    RedisPubSub.prototype.close = function () {
        return Promise.all([
            this.redisPublisher.quit(),
            this.redisSubscriber.quit(),
        ]);
    };
    RedisPubSub.prototype.onMessage = function (pattern, channel, message) {
        var _this = this;
        var subscribers = this.subsRefsMap.get(pattern || channel);
        if (!(subscribers === null || subscribers === void 0 ? void 0 : subscribers.size))
            return;
        var parsedMessage;
        try {
            parsedMessage = this.deserializer
                ? this.deserializer(message, { pattern: pattern, channel: channel })
                : JSON.parse(message, this.reviver);
        }
        catch (e) {
            parsedMessage = message;
        }
        subscribers.forEach(function (subId) {
            var _a = _this.subscriptionMap[subId], listener = _a[1];
            listener(parsedMessage);
        });
    };
    return RedisPubSub;
}());
exports.RedisPubSub = RedisPubSub;
function Deferred() {
    var _this = this;
    var p = this.promise = new Promise(function (resolve, reject) {
        _this.resolve = resolve;
        _this.reject = reject;
    });
    this.then = p.then.bind(p);
    this.catch = p.catch.bind(p);
    if (p.finally) {
        this.finally = p.finally.bind(p);
    }
}
//# sourceMappingURL=redis-pubsub.js.map