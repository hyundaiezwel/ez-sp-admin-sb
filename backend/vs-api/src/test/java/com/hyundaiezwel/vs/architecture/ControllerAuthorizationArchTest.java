package com.hyundaiezwel.vs.architecture;

import com.hyundaiezwel.vs.api.auth.LoginUser;
import com.hyundaiezwel.vs.api.auth.PublicApi;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaModifier;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.annotation.Annotation;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 모든 HTTP 핸들러가 "공개(@PublicApi)" 또는 "로그인 필요(@LoginUser 파라미터)"를 스스로 선언하게 한다.
 * <p>AuthInterceptor 는 @PublicApi 가 없으면 세션을 요구하므로 표식을 빠뜨려도 열리지는 않는다(fail-closed).
 * 이 규칙이 막는 것은 반대쪽 사고다 — 의도가 코드에 보이지 않아, 리뷰에서 "이 API 가 공개인지 아닌지"를 읽을 수 없게 되는 것.
 * 둘 다 붙은 핸들러도 막는다(@PublicApi 면 인터셉터가 사용자를 채우지 않아 @LoginUser 가 항상 401 이 된다).
 */
class ControllerAuthorizationArchTest {

    private static final List<Class<? extends Annotation>> HTTP_MAPPINGS = List.of(
            RequestMapping.class, GetMapping.class, PostMapping.class, PutMapping.class, PatchMapping.class, DeleteMapping.class);

    private static JavaClasses classes;

    @BeforeAll
    static void importClasses() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.hyundaiezwel.vs");
    }

    @Test
    void 모든_핸들러는_공개_또는_로그인필요를_선언한다() {
        List<JavaMethod> handlers = handlers();
        assertThat(handlers).as("핸들러를 하나도 찾지 못했다 — 임포트 설정을 확인").hasSizeGreaterThanOrEqualTo(10);

        List<String> undeclared = handlers.stream()
                .filter(m -> !isPublic(m) && !hasLoginUser(m))
                .map(ControllerAuthorizationArchTest::signature).sorted().toList();
        assertThat(undeclared)
                .as("@PublicApi(reason=…) 도 @LoginUser 파라미터도 없는 핸들러 — 공개 API 면 사유와 함께 @PublicApi, 아니면 @LoginUser 를 받아라")
                .isEmpty();

        List<String> both = handlers.stream()
                .filter(m -> isPublic(m) && hasLoginUser(m))
                .map(ControllerAuthorizationArchTest::signature).sorted().toList();
        assertThat(both).as("@PublicApi 와 @LoginUser 를 함께 쓰면 @LoginUser 가 언제나 401 이다").isEmpty();
    }

    private static List<JavaMethod> handlers() {
        return classes.stream()
                .filter(c -> c.isAnnotatedWith(RestController.class))
                .flatMap(c -> c.getMethods().stream())
                .filter(m -> m.getModifiers().contains(JavaModifier.PUBLIC))
                .filter(m -> HTTP_MAPPINGS.stream().anyMatch(m::isAnnotatedWith))
                .toList();
    }

    private static boolean isPublic(JavaMethod m) {
        JavaClass owner = m.getOwner();
        return m.isAnnotatedWith(PublicApi.class) || owner.isAnnotatedWith(PublicApi.class);
    }

    private static boolean hasLoginUser(JavaMethod m) {
        return m.getParameters().stream().anyMatch(p -> p.isAnnotatedWith(LoginUser.class));
    }

    private static String signature(JavaMethod m) {
        return m.getOwner().getSimpleName() + "#" + m.getName();
    }
}
