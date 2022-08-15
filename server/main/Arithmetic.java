package server.main;

public class Arithmetic {
  public int pow(int base, int power) {
    if (power == 0) {
      return 1;
    } else if (power % 2 == 0) {
      int multiplier = pow(base, power / 2);
      return multiplier * multiplier;
    } else {
      return base * pow(base, power - 1);
    }
  }
}
