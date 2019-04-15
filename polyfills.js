if (!Array.prototype.find) {
  Array.prototype.find = function (checker) {
    return this[this.findIndex(checker)];
  };
  Array.prototype.findIndex = function (checker) {
    for (var index = 0; index < this.length; index++) {
      if (checker(this[index],  index, this)) {
        return index;
      }
    }
    return -1;
  };
}

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (string) {
    return this.indexOf(string) === 0;
  };
}

if (!Object.assign) {
  Object.assign = function (result) {
    for (var index = 1; index < arguments.length; index++) {
      const object = arguments[index];
      if (object) {
        for (var key in object) {
          if (object.hasOwnProperty(key)) {
            result[key] = object[key];
          }
        }
      }
    }
    return result;
  };
}
