# Platform terminology — de-DE
# Terms are the canonical Fluent source of truth.
# Message keys below are stable aliases so app code can still reference `platform-*`.

# Core terms
-platform-type =
    .label = Plattform für digitale Belegschaften
    .inline = Plattform für digitale Belegschaften
    .label-plural = Plattformen für digitale Belegschaften
    .inline-plural = Plattformen für digitale Belegschaften

-platform-enabler =
    .label = Enterprise AI
    .inline = Enterprise AI
    .label-plural = Enterprise AI
    .inline-plural = Enterprise AI

-platform-ai-agent-fleet =
    .label = Digitale Belegschaft
    .inline = Digitale Belegschaft
    .label-plural = Digitale Belegschaften
    .inline-plural = Digitale Belegschaften

-platform-ai-agent =
    .label = Digitale Arbeitskraft
    .inline = Digitale Arbeitskraft
    .label-plural = Digitale Arbeitskräfte
    .inline-plural = Digitale Arbeitskräfte

-platform-ai-agent-product =
    .label = Enterprise-Agent-Worker
    .inline = Enterprise-Agent-Worker
    .label-plural = Enterprise-Agent-Worker
    .inline-plural = Enterprise-Agent-Worker

-platform-ai-agent-network =
    .label = Agent Operating System
    .inline = Agent Operating System
    .label-plural = Agent Operating Systems
    .inline-plural = Agent Operating Systems

-platform-domain-create =
    .label = KI-Entwicklungsplattform
    .inline = KI-Entwicklungsplattform
    .label-plural = KI-Entwicklungsplattformen
    .inline-plural = KI-Entwicklungsplattformen

-platform-domain-business =
    .label = Business-Capability-Plattform
    .inline = Business-Capability-Plattform
    .label-plural = Business-Capability-Plattformen
    .inline-plural = Business-Capability-Plattformen

-platform-domain-workplace =
    .label = Digitale Workplace-Plattform
    .inline = digitale Workplace-Plattform
    .label-plural = Digitale Workplace-Plattformen
    .inline-plural = digitale Workplace-Plattformen

-platform-business-capability-pack =
    .label = Business-Capability-Paket
    .inline = Business-Capability-Paket
    .label-plural = Business-Capability-Pakete
    .inline-plural = Business-Capability-Pakete

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
   *[other] { -platform-type.label-plural }
}
platform-type-inline-count = { $count ->
    [one] { -platform-type.inline }
   *[other] { -platform-type.inline-plural }
}

platform-enabler = { -platform-enabler.label }
platform-enabler-inline = { -platform-enabler.inline }
platform-enabler-count = { $count ->
    [one] { -platform-enabler.label }
   *[other] { -platform-enabler.label-plural }
}
platform-enabler-inline-count = { $count ->
    [one] { -platform-enabler.inline }
   *[other] { -platform-enabler.inline-plural }
}

platform-ai-agent-fleet = { -platform-ai-agent-fleet.label }
platform-ai-agent-fleet-inline = { -platform-ai-agent-fleet.inline }
platform-ai-agent-fleet-count = { $count ->
    [one] { -platform-ai-agent-fleet.label }
   *[other] { -platform-ai-agent-fleet.label-plural }
}
platform-ai-agent-fleet-inline-count = { $count ->
    [one] { -platform-ai-agent-fleet.inline }
   *[other] { -platform-ai-agent-fleet.inline-plural }
}

platform-ai-agent = { -platform-ai-agent.label }
platform-ai-agent-inline = { -platform-ai-agent.inline }
platform-ai-agent-count = { $count ->
    [one] { -platform-ai-agent.label }
   *[other] { -platform-ai-agent.label-plural }
}
platform-ai-agent-inline-count = { $count ->
    [one] { -platform-ai-agent.inline }
   *[other] { -platform-ai-agent.inline-plural }
}

platform-ai-agent-product = { -platform-ai-agent-product.label }
platform-ai-agent-product-inline = { -platform-ai-agent-product.inline }
platform-ai-agent-product-count = { $count ->
    [one] { -platform-ai-agent-product.label }
   *[other] { -platform-ai-agent-product.label-plural }
}
platform-ai-agent-product-inline-count = { $count ->
    [one] { -platform-ai-agent-product.inline }
   *[other] { -platform-ai-agent-product.inline-plural }
}

platform-ai-agent-network = { -platform-ai-agent-network.label }
platform-ai-agent-network-inline = { -platform-ai-agent-network.inline }
platform-ai-agent-network-count = { $count ->
    [one] { -platform-ai-agent-network.label }
   *[other] { -platform-ai-agent-network.label-plural }
}
platform-ai-agent-network-inline-count = { $count ->
    [one] { -platform-ai-agent-network.inline }
   *[other] { -platform-ai-agent-network.inline-plural }
}

platform-domain-create = { -platform-domain-create.label }
platform-domain-create-inline = { -platform-domain-create.inline }
platform-domain-create-count = { $count ->
    [one] { -platform-domain-create.label }
   *[other] { -platform-domain-create.label-plural }
}
platform-domain-create-inline-count = { $count ->
    [one] { -platform-domain-create.inline }
   *[other] { -platform-domain-create.inline-plural }
}

platform-domain-business = { -platform-domain-business.label }
platform-domain-business-inline = { -platform-domain-business.inline }
platform-domain-business-count = { $count ->
    [one] { -platform-domain-business.label }
   *[other] { -platform-domain-business.label-plural }
}
platform-domain-business-inline-count = { $count ->
    [one] { -platform-domain-business.inline }
   *[other] { -platform-domain-business.inline-plural }
}

platform-domain-workplace = { -platform-domain-workplace.label }
platform-domain-workplace-inline = { -platform-domain-workplace.inline }
platform-domain-workplace-count = { $count ->
    [one] { -platform-domain-workplace.label }
   *[other] { -platform-domain-workplace.label-plural }
}
platform-domain-workplace-inline-count = { $count ->
    [one] { -platform-domain-workplace.inline }
   *[other] { -platform-domain-workplace.inline-plural }
}

platform-business-capability-pack = { -platform-business-capability-pack.label }
platform-business-capability-pack-inline = { -platform-business-capability-pack.inline }
platform-business-capability-pack-count = { $count ->
    [one] { -platform-business-capability-pack.label }
   *[other] { -platform-business-capability-pack.label-plural }
}
platform-business-capability-pack-inline-count = { $count ->
    [one] { -platform-business-capability-pack.inline }
   *[other] { -platform-business-capability-pack.inline-plural }
}

platform-value-pack = { -platform-value-pack.label }
platform-value-pack-inline = { -platform-value-pack.inline }
platform-value-pack-count = { $count ->
    [one] { -platform-value-pack.label }
   *[other] { -platform-value-pack.label-plural }
}
platform-value-pack-inline-count = { $count ->
    [one] { -platform-value-pack.inline }
   *[other] { -platform-value-pack.inline-plural }
}

platform-credit = { -platform-credit.label }
platform-credit-inline = { -platform-credit.inline }
platform-credit-count = { $count ->
    [one] { -platform-credit.label }
   *[other] { -platform-credit.label-plural }
}
platform-credit-inline-count = { $count ->
    [one] { -platform-credit.inline }
   *[other] { -platform-credit.inline-plural }
}

# Reusable claim lines
platform-enabler-claim = Angetrieben von { -platform-enabler.label }
platform-type-claim = NEWWORK ist die { -platform-type.label } für das Unternehmen.
platform-differentiation-claim = Kein weiteres Agent-Framework. Die Betriebsumgebung für gesteuerte { -platform-ai-agent.inline-plural }.
platform-ai-agent-network-claim = Das { -platform-ai-agent-network.label } koordiniert { -platform-ai-agent.inline-plural }, Menschen, Workflows, Richtlinien und Unternehmenssysteme.
platform-transformation-claim = Von Systems of Record zu Systems of Intelligence.
platform-knowledge-claim = Operating Mind of the Enterprise
platform-governance-claim = Jede { -platform-ai-agent.inline } hat eine Rolle, einen Owner, Berechtigungen, einen Richtlinienrahmen, Workflow-Grenzen und einen Audit-Trail.
platform-business-significance-pricing-claim = Bepreise den Wert betriebener { -platform-business-capability-pack.inline-plural }, nicht den rohen AI-Verbrauch.
platform-credit-claim = Credits steuern die Nutzung; { -platform-business-capability-pack.inline } definiert den Preis.
