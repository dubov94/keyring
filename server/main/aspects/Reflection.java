package keyring.server.main.aspects;

import java.util.Arrays;
import java.util.List;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.reflect.MethodSignature;

class Reflection {
  static Object getArgByName(JoinPoint joinPoint, String argName) {
    MethodSignature methodSignature = (MethodSignature) joinPoint.getSignature();
    List<String> parameterNames = Arrays.asList(methodSignature.getParameterNames());
    int index = parameterNames.indexOf(argName);
    if (index == -1) {
      throw new IllegalStateException(String.format("Parameter `%s` does not exist", argName));
    }
    return joinPoint.getArgs()[index];
  }
}
