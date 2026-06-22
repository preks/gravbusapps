# Platform terminology — ro-RO
# Terms are the canonical Fluent source of truth.
# Message keys below are stable aliases so app code can still reference `platform-*`.

# Core terms
-platform-type =
    .label = Platformă pentru forța de muncă digitală
    .inline = platformă pentru forța de muncă digitală
    .label-plural = Platforme pentru forța de muncă digitală
    .inline-plural = platforme pentru forța de muncă digitală

-platform-enabler =
    .label = Enterprise AI
    .inline = Enterprise AI
    .label-plural = Enterprise AI
    .inline-plural = Enterprise AI

-platform-ai-agent-fleet =
    .label = Forță de muncă digitală
    .inline = forță de muncă digitală
    .label-plural = Forțe de muncă digitale
    .inline-plural = forțe de muncă digitale

-platform-ai-agent =
    .label = Angajat digital
    .inline = angajat digital
    .label-plural = Angajați digitali
    .inline-plural = angajați digitali

-platform-ai-agent-product =
    .label = Agent enterprise operațional
    .inline = agent enterprise operațional
    .label-plural = Agenți enterprise operaționali
    .inline-plural = agenți enterprise operaționali

-platform-ai-agent-network =
    .label = Sistem de operare pentru agenți
    .inline = sistem de operare pentru agenți
    .label-plural = Sisteme de operare pentru agenți
    .inline-plural = sisteme de operare pentru agenți

-platform-domain-create =
    .label = Platformă de dezvoltare AI
    .inline = platformă de dezvoltare AI
    .label-plural = Platforme de dezvoltare AI
    .inline-plural = platforme de dezvoltare AI

-platform-domain-business =
    .label = Platformă pentru capabilități de business
    .inline = platformă pentru capabilități de business
    .label-plural = Platforme pentru capabilități de business
    .inline-plural = platforme pentru capabilități de business

-platform-domain-workplace =
    .label = Platformă digitală de lucru
    .inline = platformă digitală de lucru
    .label-plural = Platforme digitale de lucru
    .inline-plural = platforme digitale de lucru

-platform-business-capability-pack =
    .label = Pachet de capabilități de business
    .inline = pachet de capabilități de business
    .label-plural = Pachete de capabilități de business
    .inline-plural = pachete de capabilități de business

-platform-value-pack =
    .label = Value Pack
    .inline = Value Pack
    .label-plural = Value Packs
    .inline-plural = Value Packs

-platform-credit =
    .label = NEWWORK Credit
    .inline = NEWWORK Credit
    .label-plural = NEWWORK Credits
    .inline-plural = NEWWORK Credits

# Stable message aliases for direct usage
platform-type = { -platform-type.label }
platform-type-inline = { -platform-type.inline }
platform-type-count = { $count ->
    [one] { -platform-type.label }
    [few] { -platform-type.label-plural }
   *[other] { -platform-type.label-plural }
}
platform-type-inline-count = { $count ->
    [one] { -platform-type.inline }
    [few] { -platform-type.inline-plural }
   *[other] { -platform-type.inline-plural }
}

platform-enabler = { -platform-enabler.label }
platform-enabler-inline = { -platform-enabler.inline }
platform-enabler-count = { $count ->
    [one] { -platform-enabler.label }
    [few] { -platform-enabler.label-plural }
   *[other] { -platform-enabler.label-plural }
}
platform-enabler-inline-count = { $count ->
    [one] { -platform-enabler.inline }
    [few] { -platform-enabler.inline-plural }
   *[other] { -platform-enabler.inline-plural }
}

platform-ai-agent-fleet = { -platform-ai-agent-fleet.label }
platform-ai-agent-fleet-inline = { -platform-ai-agent-fleet.inline }
platform-ai-agent-fleet-count = { $count ->
    [one] { -platform-ai-agent-fleet.label }
    [few] { -platform-ai-agent-fleet.label-plural }
   *[other] { -platform-ai-agent-fleet.label-plural }
}
platform-ai-agent-fleet-inline-count = { $count ->
    [one] { -platform-ai-agent-fleet.inline }
    [few] { -platform-ai-agent-fleet.inline-plural }
   *[other] { -platform-ai-agent-fleet.inline-plural }
}

platform-ai-agent = { -platform-ai-agent.label }
platform-ai-agent-inline = { -platform-ai-agent.inline }
platform-ai-agent-count = { $count ->
    [one] { -platform-ai-agent.label }
    [few] { -platform-ai-agent.label-plural }
   *[other] { -platform-ai-agent.label-plural }
}
platform-ai-agent-inline-count = { $count ->
    [one] { -platform-ai-agent.inline }
    [few] { -platform-ai-agent.inline-plural }
   *[other] { -platform-ai-agent.inline-plural }
}

platform-ai-agent-product = { -platform-ai-agent-product.label }
platform-ai-agent-product-inline = { -platform-ai-agent-product.inline }
platform-ai-agent-product-count = { $count ->
    [one] { -platform-ai-agent-product.label }
    [few] { -platform-ai-agent-product.label-plural }
   *[other] { -platform-ai-agent-product.label-plural }
}
platform-ai-agent-product-inline-count = { $count ->
    [one] { -platform-ai-agent-product.inline }
    [few] { -platform-ai-agent-product.inline-plural }
   *[other] { -platform-ai-agent-product.inline-plural }
}

platform-ai-agent-network = { -platform-ai-agent-network.label }
platform-ai-agent-network-inline = { -platform-ai-agent-network.inline }
platform-ai-agent-network-count = { $count ->
    [one] { -platform-ai-agent-network.label }
    [few] { -platform-ai-agent-network.label-plural }
   *[other] { -platform-ai-agent-network.label-plural }
}
platform-ai-agent-network-inline-count = { $count ->
    [one] { -platform-ai-agent-network.inline }
    [few] { -platform-ai-agent-network.inline-plural }
   *[other] { -platform-ai-agent-network.inline-plural }
}

platform-domain-create = { -platform-domain-create.label }
platform-domain-create-inline = { -platform-domain-create.inline }
platform-domain-create-count = { $count ->
    [one] { -platform-domain-create.label }
    [few] { -platform-domain-create.label-plural }
   *[other] { -platform-domain-create.label-plural }
}
platform-domain-create-inline-count = { $count ->
    [one] { -platform-domain-create.inline }
    [few] { -platform-domain-create.inline-plural }
   *[other] { -platform-domain-create.inline-plural }
}

platform-domain-business = { -platform-domain-business.label }
platform-domain-business-inline = { -platform-domain-business.inline }
platform-domain-business-count = { $count ->
    [one] { -platform-domain-business.label }
    [few] { -platform-domain-business.label-plural }
   *[other] { -platform-domain-business.label-plural }
}
platform-domain-business-inline-count = { $count ->
    [one] { -platform-domain-business.inline }
    [few] { -platform-domain-business.inline-plural }
   *[other] { -platform-domain-business.inline-plural }
}

platform-domain-workplace = { -platform-domain-workplace.label }
platform-domain-workplace-inline = { -platform-domain-workplace.inline }
platform-domain-workplace-count = { $count ->
    [one] { -platform-domain-workplace.label }
    [few] { -platform-domain-workplace.label-plural }
   *[other] { -platform-domain-workplace.label-plural }
}
platform-domain-workplace-inline-count = { $count ->
    [one] { -platform-domain-workplace.inline }
    [few] { -platform-domain-workplace.inline-plural }
   *[other] { -platform-domain-workplace.inline-plural }
}

platform-business-capability-pack = { -platform-business-capability-pack.label }
platform-business-capability-pack-inline = { -platform-business-capability-pack.inline }
platform-business-capability-pack-count = { $count ->
    [one] { -platform-business-capability-pack.label }
    [few] { -platform-business-capability-pack.label-plural }
   *[other] { -platform-business-capability-pack.label-plural }
}
platform-business-capability-pack-inline-count = { $count ->
    [one] { -platform-business-capability-pack.inline }
    [few] { -platform-business-capability-pack.inline-plural }
   *[other] { -platform-business-capability-pack.inline-plural }
}

platform-value-pack = { -platform-value-pack.label }
platform-value-pack-inline = { -platform-value-pack.inline }
platform-value-pack-count = { $count ->
    [one] { -platform-value-pack.label }
    [few] { -platform-value-pack.label-plural }
   *[other] { -platform-value-pack.label-plural }
}
platform-value-pack-inline-count = { $count ->
    [one] { -platform-value-pack.inline }
    [few] { -platform-value-pack.inline-plural }
   *[other] { -platform-value-pack.inline-plural }
}

platform-credit = { -platform-credit.label }
platform-credit-inline = { -platform-credit.inline }
platform-credit-count = { $count ->
    [one] { -platform-credit.label }
    [few] { -platform-credit.label-plural }
   *[other] { -platform-credit.label-plural }
}
platform-credit-inline-count = { $count ->
    [one] { -platform-credit.inline }
    [few] { -platform-credit.inline-plural }
   *[other] { -platform-credit.inline-plural }
}

# Reusable claim lines
platform-enabler-claim = Cu { -platform-enabler.label } la bază
platform-type-claim = NEWWORK este { -platform-type.inline } pentru întreprindere.
platform-differentiation-claim = Nu este doar un framework de agenți. Este mediul operațional pentru { -platform-ai-agent.inline-plural } guvernați.
platform-ai-agent-network-claim = { -platform-ai-agent-network.label } coordonează { -platform-ai-agent.inline-plural }, oamenii, fluxurile de lucru, politicile și sistemele enterprise.
platform-transformation-claim = De la sisteme de evidență la sisteme de inteligență.
platform-knowledge-claim = Mintea operațională a întreprinderii
platform-governance-claim = Fiecare { -platform-ai-agent.inline } are un rol, un responsabil, permisiuni, un domeniu de aplicare al politicilor, limite de workflow și o urmă de audit.
platform-business-significance-pricing-claim = Prețuiește valoarea { -platform-business-capability-pack.inline-plural } operate, nu consumul brut de AI.
platform-credit-claim = Credits controlează utilizarea; { -platform-business-capability-pack.inline } definește prețul.
