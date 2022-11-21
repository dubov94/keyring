package keyring.server.main.interceptors;

import io.grpc.*;
import io.vavr.control.Either;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.inject.Inject;
import keyring.server.main.Environment;

public class VersionInterceptor implements ServerInterceptor {
  private static final Pattern VERSION_PATTERN =
      Pattern.compile("^v0.0.0-(?<version>\\d+)-g[0-9a-z]{7}$");

  private Environment environment;

  @Inject
  VersionInterceptor(Environment environment) {
    this.environment = environment;
  }

  private Optional<Integer> versionToOrdinal(String version) {
    Matcher matcher = VERSION_PATTERN.matcher(version);
    if (!matcher.matches()) {
      return Optional.empty();
    }
    return Optional.of(Integer.parseInt(matcher.group("version")));
  }

  private Either<Status, Context> _interceptCall(Metadata metadata) {
    String clientVersion = metadata.get(VersionAccessor.METADATA_CLIENT_VERSION_KEY);
    // Enable `X-Client-Version`-less calls.
    if (clientVersion == null) {
      return Either.right(Context.current());
    }
    Optional<Integer> clientOrdinal = versionToOrdinal(clientVersion);
    if (!clientOrdinal.isPresent()) {
      return Either.left(Status.UNIMPLEMENTED);
    }
    Optional<Integer> mrgnOrdinal = versionToOrdinal(environment.getMrgnVersion());
    if (clientOrdinal.get() < mrgnOrdinal.get()) {
      return Either.left(Status.UNIMPLEMENTED);
    }
    Context context =
        Context.current().withValue(VersionAccessor.CONTEXT_CLIENT_VERSION_KEY, clientVersion);
    return Either.right(context);
  }

  @Override
  public <I, O> ServerCall.Listener<I> interceptCall(
      ServerCall<I, O> call, Metadata metadata, ServerCallHandler<I, O> next) {
    Either<Status, Context> result = _interceptCall(metadata);
    if (result.isRight()) {
      return Contexts.interceptCall(result.get(), call, metadata, next);
    } else {
      call.close(result.getLeft(), new Metadata());
      return new ServerCall.Listener<I>() {};
    }
  }
}
