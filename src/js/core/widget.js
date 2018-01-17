import dataQueue from "./sequnce"
import buildNexus from "./nexus"
import proxy from "./virtual/proxy"
import watch from "./watch"

/**
 * @fileOverview 这是Page的基类，所有Page的默认事件和流程都是在这里被定义<br>
 * 所有Page类通过[xjs.declare]{@link xjs.declare}申明，并将[widget]{@link widget}作为`parents`参数传入，用以继承默认事件流程。<br>
 * 最后使用[xjs.createView]{@link xjs.createView}实例化Page类
 *
 * 所有基类的函数都可以被重写（除了`init`）,重写后的事件可以调用`this.super()`方法执行父类被覆盖的函数<br>
 * widget的流程行顺序按照以下:<br>
 * `init—>render—>request—>syncGetData—>buildRender—>startup—>onExit`
 * @mixin widget
 */

class widget {
    /**
     * Page类的初始化函数，同时控制渲染事件的执行流程，此方法不可以被重写。
     * @memberOf widget
     * @function init
     * @param dom 根Dom节点，用于插入模板
     */
    constructor(dom, params, nexus) {

        if (params != undefined) {
            Object.assign(this, params);
        }

        this.El = dom;
        /**
         * 定义Page的标题
         *
         * @type {string}
         * @memberOf widget
         * @name title
         */
        setTitle(this.title || document.title);

        return new Promise((resolve, reject) => {
            this.postRequest(() => {
                this.buildRender();
                // this.buildNexus(() => {
                    /**
                     * 当模板和数据都被渲染后就会调用startup事件，Page里的Dom节点操作以及业务逻辑都应该在这里实现。
                     * @memberOf widget
                     * @function startup
                     */
                    this.startup && this.startup();
                    resolve(this);
                // }, nexus, reject)
            }, reject);
        })
    }
    postRequest(call, reject) {
        let request = this.request ? this.request() : false;
        if (request == false) {
            return call(this);
        }
        return dataQueue(request).then(data => {
            this.data = data;
            call(this);
        }).catch(error => reject(error));
    }
    /**
     * 模板渲染流程，将会把this对象作为数据采集对象传入模板。并扫描模板里的自定义锚点后映射到this对象上<br>
     * [data-xjs-element] 将挂载到this对象上，并通过$ + name 用以区分普通dom对象和jquery对象
     * @example
     * <div data-xjs-element="divNode"></div>
     * //this.divNode 获取原始dom对象
     * //this.$divNode 获取jquery对象
     * @memberOf widget
     * @function buildRender
     * @see {widget#request}
     */
    buildRender() {
        /**
         * 传入模板字符串，基于`underscore`的模板引擎渲染HTML
         *
         * @type {string}
         * @memberOf widget
         * @name templateString
         */

        let _proxy = new proxy(this.El, this.data, this.template);

        this.$set = (obj, prop, value) => {
            let val = value;
            let type = Object.prototype.toString.call(val);

            Object.defineProperty(obj, prop, {
                enumerable: true,
                configurable: true,
                get: () => {
                    return val;
                },
                set: (newVal) => {
                    val = newVal;
                    _proxy.updateView();
                }
            });

            if (type == '[object Object]' || type == '[object Array]') {
                new watch(val, () => {
                    _proxy.updateView.call(_proxy);
                });
            }

            _proxy.updateView();
        };

        this.$delete = (obj, prop) => {
            let type = Object.prototype.toString.call(obj);

            if (type == '[object Object]') {
                delete obj[prop];
                _proxy.updateView();
            } else if (type == '[object Array]') {
                obj.splice(obj.indexOf(prop), 1);
            }
        };

        this.reRender = () => {
            this.startup && this.startup();
            _proxy.render(this.data);
        };

        this.hangUp = () => {
            this.El.innerHTML = "";
            _proxy.stopRender();
        }
    }
    // buildNexus(end, nexus) {
    //     let child = __createNexus.call(this, end, nexus);
    //     this.child = child;
    // }
    /**
     * Page的退出事件，在路由切换被触发时调用，如果有添加事件监听需要自行注销，应该写在这个事件里，
     * 如果你复写了这个函数，别忘了在function末尾调用this._super()
     * @memberOf widget
     * @function onExit
     */
    onExit() {
        // if (this.child) {
        //     this.child.forEach(son => {
        //         son.instance.onExit();
        //     })
        // }
        // this.$domNode.remove();
    }
}

function setTitle(title) {
    document.title = title;
}

// function __createNexus(end, currentNexus, reject) {
//     let doms, batch;
//     let map = [];
//
//     if (currentNexus == undefined) {
//         window.nexus = currentNexus = {members: [], call: null, ready: false};
//     }
//
//     doms = this.domNode.querySelectorAll('[data-xjs-nexus]');
//     batch = this.defineNexus ? this.defineNexus() : false;
//
//     if (batch == false) {
//         return end();
//     }
//
//     if (!(batch instanceof Array)) {
//         batch = [batch];
//     }
//
//     doms.forEach(dom => {
//         let name = dom.dataset["xjsNexus"];
//
//         batch.forEach(item => {
//             if (item.name == name) {
//                 item.dom = dom;
//                 map.push(item);
//             }
//         })
//     });
//
//     return new buildNexus(map, currentNexus, end, reject);
// }

export default widget;