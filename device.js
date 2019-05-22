const sleep = require('sleep-promise');
const miio = require('miio');
const { EventEmitter } = require('events');

class Device extends EventEmitter {

  static get FEATURES() {
    return ['mode', 'power', 'led', 'aqi', 'temperature', 'humidity'];
  }

  static get CHANGABLES() {
    return ['mode', 'power', 'led'];
  }

  constructor(name, ip, mode) {
    super(); // TODO: EventEmitter

    this.ref = null;
    this.mode = null;
    this.name = name;
    this.ip = ip;
    this.modeName = mode;
    this.polls = new Set(['mode', 'favoriteLevel']);
    this.pollingInterval = 1000;
    this.isPolling = false;

    this.stats = { mode: null, favoriteLevel: null, power: null, led: null, aqi: null, temperature: null, humidity: null };
  }

  setParentMode(mode) {
    this.mode = mode;
  }

  setPollingInterval(interval) {
    this.pollingInterval = interval;
  }

  get connected() {
    return this.ref !== null;
  }

  async connect() {
    const address = this.ip;

    this.ref = await miio.device({ address });
    if (!this.ref.matches('type:air-purifier')) {
      throw new Error(`Not an air purifier given: ${address}`);
    }

    // patch for usages
    this.ref.aqi = this.ref.pm2_5;

    return true;
  }

  async subscribe(...features) {
    if (features.includes('aqi')) {
      // miio library supports to get the current AQI by its event listener
      // but it is slower than this method
      // ...? this is slow too i guess the device has a its own cache to handle
      // multiple requests
      // -> the same issue applies to the others
      this.polls.add('aqi');
    }
    if (features.includes('temperature')) {
      this.polls.add('temperature');
    }
    if (features.includes('humidity')) {
      this.polls.add('humidity');
    }
    
    if (features.includes('led')) {
      this.polls.add('led');
    }

    if (this.isPolling === false) {
      // power = default
      //this.ref.on('power', power => {
      //  this.stats.power = power;
      //});
      //this.stats.power = await this.ref.power();
      //if( this.stats.power == on ) {
      //this.poll().then();
      //}
      this.poll().then();//처음 실행시 한번 실행 시키기 위한 if문 안에 있는 것으로 보임
    }
    

    return true;
  }

  async poll() {
    const update = async (what) => this.stats[what] = await this.ref[what]();

    for (;;) {
      this.isPolling = true;

      const promises = [];
      for (const feature of this.polls) {
        switch(feature) {
          case 'aqi':
          case 'mode':
          case 'favoriteLevel':
          case 'temperature':
          case 'humidity':
          case 'led':

      	  //this.stats.power = await this.ref.power();
          //await sleep(1000);
          //this.stats.power = await this.ref.power();
          //await sleep(1000);
          //this.stats.power = await this.ref.power();
          //await sleep(1000);
          this.stats.power = await this.ref.power();
      	  if( this.stats.power == true ) {
            promises.push(update(feature));
          }
          break;
        }
      }

      await Promise.all(promises);
      console.info(String(new Date), `POWER [${this.stats.power}] LED [${this.stats.led}] PM2.5 [${this.stats.aqi}] MODE [${this.stats.mode}]`);
      await sleep(this.pollingInterval);
    }
  }

  async update(feature, ...args) {
    if (this.stats[feature] === null) {
      return false;
    } else if (args.length === 1) {
      if (this.stats[feature] === args[0]) {
        return false;
      }
    }

    let fn;
    fn = this.setMode;
    //console.info('bbbbb');
  
    this.stats.power = await this.ref.power();
    if( this.stats.power == true ) {
      if (fn !== undefined) {
        // pass with favorite levels because of slow updates
        //if (feature !== 'mode' || feature === 'mode' && args[0] === 'favorite' && this.stats.mode !== 'favorite') {
        //if (args[0] === 'favorite') {
        //  console.info(String(new Date), 'updating', feature, 'to', ...args);
        //}
    	//console.info('ddd');
        await fn.bind(this)(...args);
      }   
    }
  }

  async setPower(on) {
    //await this.ref.setPower(on);
    //this.stats.power = on;

    return true;
  }

  async setMode(mode = 'auto', level = null) {
    //if (!['auto', 'silent', 'favorite'].includes(mode)) {
    //  throw new Error(`mode ${mode} is not supported`);
    //}
    //if (level !== null && (level < 0 || level > 16)) {
    //  throw new Error(`level must be range from 1 to 16`);
    //}

    this.stats.power = await this.ref.power();
    if( this.stats.power == true ) {
    	await this.ref.setMode(mode);
    	this.stats.mode = mode;
    	  
    	if (level !== null) {
    	  await this.ref.setFavoriteLevel(level);
    	  this.stats.favoriteLevel = level;
    	}
    }
    else {
      return false;
    }
    
    //console.info('aaaaa');

    return true;
  }

  async setLED(enabled) {
    await this.ref.led(enabled);
    this.stats.led = enabled;

    return true;
  }

}

module.exports = Device;
