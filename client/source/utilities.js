export const shuffle = (array) => {
  let limit = array.length
  while (limit > 0) {
    let index = Math.floor(Math.random() * limit--);
    [array[index], array[limit]] = [array[limit], array[index]]
  }
}
