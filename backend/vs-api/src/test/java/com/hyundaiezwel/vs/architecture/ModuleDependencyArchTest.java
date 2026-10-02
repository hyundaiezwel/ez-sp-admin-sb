package com.hyundaiezwel.vs.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/** 모듈 경계. vs-api 는 암호 타입(BCrypt·javax.crypto·jjwt)을 직접 쓰지 않는다 — 그건 vs-infra 의 일이다. */
class ModuleDependencyArchTest {

    private static JavaClasses classes;

    @BeforeAll
    static void importClasses() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.hyundaiezwel.vs");
    }

    @Test
    void api는_crypto_타입을_import하지_않는다() {
        noClasses().that().resideInAPackage("com.hyundaiezwel.vs.api..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "org.springframework.security.crypto..", "javax.crypto..", "io.jsonwebtoken..")
                .check(classes);
    }

    @Test
    void domain은_infra나_api를_모른다() {
        noClasses().that().resideInAnyPackage("com.hyundaiezwel.vs.auth..", "com.hyundaiezwel.vs.common..", "com.hyundaiezwel.vs.code..")
                .should().dependOnClassesThat().resideInAnyPackage("com.hyundaiezwel.vs.infra..", "com.hyundaiezwel.vs.api..",
                        "org.springframework..")
                .check(classes);
    }

    @Test
    void infra는_api를_모른다() {
        noClasses().that().resideInAPackage("com.hyundaiezwel.vs.infra..")
                .should().dependOnClassesThat().resideInAPackage("com.hyundaiezwel.vs.api..")
                .check(classes);
    }
}
