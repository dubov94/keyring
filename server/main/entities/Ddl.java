package server.main.entities;

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
    metadataSources.addAnnotatedClass(Key.class);
    metadataSources.addAnnotatedClass(MailToken.class);
    metadataSources.addAnnotatedClass(Session.class);
    metadataSources.addAnnotatedClass(Tag.class);
    metadataSources.addAnnotatedClass(User.class);
    Metadata metadata = metadataSources.buildMetadata();
    SchemaExport schemaExport = new SchemaExport();
    schemaExport.setFormat(true);
    schemaExport.createOnly(EnumSet.of(TargetType.STDOUT), metadata);
  }
}
