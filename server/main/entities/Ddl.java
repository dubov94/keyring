package keyring.server.main.entities;

import java.util.EnumSet;
import org.hibernate.boot.Metadata;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.tool.hbm2ddl.SchemaExport;
import org.hibernate.tool.schema.TargetType;

final class Ddl {
  public static void main(String[] args) {
    StandardServiceRegistry serviceRegistry =
        new StandardServiceRegistryBuilder().configure().build();
    MetadataSources metadataSources = new MetadataSources(serviceRegistry);
    metadataSources.addAnnotatedClass(FeaturePrompts.class);
    metadataSources.addAnnotatedClass(Key.class);
    metadataSources.addAnnotatedClass(MailToken.class);
    metadataSources.addAnnotatedClass(MailTokenStateConverter.class);
    metadataSources.addAnnotatedClass(OtpParams.class);
    metadataSources.addAnnotatedClass(OtpToken.class);
    metadataSources.addAnnotatedClass(Session.class);
    metadataSources.addAnnotatedClass(SessionStageConverter.class);
    metadataSources.addAnnotatedClass(User.class);
    metadataSources.addAnnotatedClass(UserStateConverter.class);
    Metadata metadata = metadataSources.buildMetadata();
    SchemaExport schemaExport = new SchemaExport();
    schemaExport.setFormat(true);
    schemaExport.createOnly(EnumSet.of(TargetType.STDOUT), metadata);
  }
}
