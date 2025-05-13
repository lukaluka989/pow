class Shield {
  constructor(n, t, e, r = !0) {
    this.workers = [];
    this.challenge = e;
    this.difficulty = t;
    this.publicSalt = n;
    this.navigatorData = this.cloneObject(navigator, 0);
    this.numeric = r;
    this.workerScript = `
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js');
  
        self.onmessage = function(e) {
            function compareObj(obj1, obj2, iteration) {
                if (iteration > 4) return "";
                for (let key in obj1) {
                    if (key == "rtt") return "";
                    if (typeof obj1[key] === "function") return "";
                    if (typeof obj1[key] === "object" && obj1[key] !== null) {
                        return compareObj(obj1[key], obj2[key], iteration + 1);
                    } else {
                        if (obj1[key] !== obj2[key]) {
                            return key + ", ";
                        }
                    }
                }
                return "";
            }
  
            function incrementHexString(str) {
                const chars = '0123456789abcdef';
                let carry = 1;
                let res = '';
                for (let i = str.length - 1; i >= 0; i--) {
                    let index = chars.indexOf(str[i]) + carry;
                    if (index >= chars.length) {
                        index = 0;
                        carry = 1;
                    } else {
                        carry = 0;
                    }
                    res = chars[index] + res;
                }
                return carry ? '0' + res : res;
            }
  
            function getStringByIndex(index, length) {
                const chars = '0123456789abcdef';
                let res = '';
                for (let i = 0; i < length; i++) {
                    res = chars[index % chars.length] + res;
                    index = Math.floor(index / chars.length);
                }
                return res.padStart(length, '0');
            }
  
            const {
                publicSalt,
                challenge,
                start,
                end,
                numeric,
                difficulty,
                clientNavigator
            } = e.data;
            let resp = {
                match: compareObj(navigator, clientNavigator, 0),
                solution: "",
                access: ""
            };
  
            if (numeric) {
                for (let i = start; i <= end; i++) {
                    if (CryptoJS.SHA256(publicSalt + i).toString() === challenge) {
                        resp.solution = i;
                        resp.access = CryptoJS.SHA256(i.toString() + publicSalt).toString();
                        self.postMessage(resp);
                        self.close();
                        return;
                    }
                }
            } else {
                for (let i = start; i <= end; i++) {
                    let current = getStringByIndex(i, difficulty);
                    if (CryptoJS.SHA256(publicSalt + current).toString() === challenge) {
                        resp.solution = current;
                        resp.access = CryptoJS.SHA256(current + publicSalt).toString();
                        self.postMessage(resp);
                        self.close();
                        return;
                    }
                }
            }
  
            self.postMessage(resp);
            self.close();
        };
      `;
  }

  cloneObject(n, t) {
    var e = {};
    if (t > 4) return e;
    for (var r in n)
      "object" != typeof n[r] || null == n[r] || n[r] instanceof Function
        ? "function" == typeof n[r] ||
          n[r] instanceof HTMLElement ||
          (e[r] = n[r])
        : (e[r] = this.cloneObject(n[r], t + 1));
    return e;
  }

  spawnWorker(n, t, e, r, i) {
    const o = new Worker(n);
    this.workers.push(o);
    o.onmessage = (n) => {
      const t = n.data;
      ("" != t.match && null == navigator.brave) || "" === t.solution
        ? i("No solution found")
        : (this.workers.forEach((n) => {
            n.terminate();
          }),
          r(t));
    };
    o.postMessage({
      challenge: this.challenge,
      publicSalt: this.publicSalt,
      start: t,
      end: e,
      numeric: this.numeric,
      difficulty: this.difficulty,
      clientNavigator: this.navigatorData,
    });
  }

  async Solve() {
    let n = navigator.hardwareConcurrency || 2;
    n = Math.min(n, 16);
    const t = this.numeric
        ? Math.ceil(this.difficulty / n)
        : Math.ceil(Math.pow(16, this.difficulty) / n),
      e = [],
      r = new Blob([this.workerScript], { type: "text/javascript" }),
      i = URL.createObjectURL(r);
    for (
      let n = 0;
      n < (this.numeric ? this.difficulty : Math.pow(16, this.difficulty));
      n += t
    )
      e.push(
        new Promise((e, r) => {
          this.spawnWorker(
            i,
            n,
            Math.min(
              n + t - 1,
              this.numeric
                ? this.difficulty - 1
                : Math.pow(16, this.difficulty) - 1
            ),
            e,
            r
          );
        })
      );
    try {
      const t = await Promise.any(e);
      return t;
    } catch (n) {
      return null;
    }
  }
}
