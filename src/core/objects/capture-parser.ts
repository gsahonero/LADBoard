/**
 * Deterministic NLP & Heuristic Capture Parser for LAD Board
 * Supports dynamic slot filling for extensible Card Types and Category Schemas.
 */

import { InferredStructure } from './types';
import { LADObjectPriority } from '../standard/types';
import { SchemaRegistry } from '../schemas/schema-registry';
import { LADCardTypeDefinition } from '../schemas/card-types';

export class CaptureParser {
  /**
   * Parses free text and produces an InferredStructure for user review and confirmation.
   */
  static parse(
    text: string,
    referenceDate: Date = new Date(),
    registry: SchemaRegistry = SchemaRegistry.getInstance()
  ): InferredStructure {
    const raw = text.trim();
    if (!raw) {
      return {
        rawText: '',
        title: '',
        domain: 'general',
        priority: 'medium',
        tags: [],
        extractedActions: [],
        extractedEntities: [],
        suggestedAttributes: {},
        fieldValues: {},
      };
    }

    const domain = this.detectDomainWithRegistry(raw, registry);
    const priority = this.detectPriority(raw);
    const dueDate = this.detectDueDate(raw, referenceDate);
    const assignedTo = this.detectAssignedPerson(raw);
    const tags = this.detectTags(raw, domain);
    const extractedActions = this.extractActionItems(raw);
    const extractedEntities = this.extractEntities(raw);

    // Identify best-matching Card Type from the schema registry
    const cardType = this.detectCardType(raw, domain, registry);
    const cardTypeId = cardType?.id;

    // Slot-fill fields defined on the matched card type
    const fieldValues = this.slotFillFields(raw, cardType, referenceDate, assignedTo);

    // Formulate a concise, clear title
    const title = this.generateTitle(raw, extractedActions, cardType, fieldValues);

    const suggestedAttributes: Record<string, any> = {
      inferred_at: referenceDate.toISOString(),
      has_followup: Boolean(dueDate || extractedActions.length > 0 || fieldValues.needs_followup),
      ...fieldValues,
    };

    if (cardTypeId) {
      suggestedAttributes.card_type = cardTypeId;
    }

    if (fieldValues.followup_date || fieldValues.needs_followup) {
      suggestedAttributes.followup = {
        date: fieldValues.followup_date || dueDate,
        reason: fieldValues.followup_reason || 'Follow-up required',
        status: 'pending',
      };
    }

    return {
      rawText: raw,
      title,
      domain,
      cardTypeId,
      priority,
      dueDate: dueDate || fieldValues.due_date,
      assignedTo: assignedTo || (fieldValues.patient !== 'Me' ? fieldValues.patient : undefined),
      tags,
      extractedActions,
      extractedEntities,
      suggestedAttributes,
      fieldValues,
    };
  }

  private static detectDomainWithRegistry(text: string, registry: SchemaRegistry): string {
    const lower = text.toLowerCase();

    // Check custom and registered categories first
    const categories = registry.getAllCategories();
    for (const cat of categories) {
      const allKeywords = [...cat.keywords, ...(cat.inferredKeywords || [])];
      for (const kw of allKeywords) {
        // match word boundary
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(lower)) {
          return cat.id;
        }
      }
    }

    // Check registered card types across categories for keywords, name, and field options
    const cardTypes = registry.getAllCardTypes();
    for (const ct of cardTypes) {
      if (ct.nlp?.keywords) {
        for (const kw of ct.nlp.keywords) {
          const regex = new RegExp(`\\b${kw}\\b`, 'i');
          if (regex.test(lower)) {
            return ct.category;
          }
        }
      }
      if (ct.name) {
        const nameRegex = new RegExp(`\\b${ct.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (nameRegex.test(lower)) {
          return ct.category;
        }
      }
      if (ct.fields) {
        for (const field of ct.fields) {
          if (field.type === 'select' && field.options) {
            for (const opt of field.options) {
              const optRegex = new RegExp(`\\b${opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
              if (optRegex.test(lower)) {
                return ct.category;
              }
            }
          }
        }
      }
    }

    return this.detectDomain(text);
  }

  static detectDomain(text: string): string {
    const lower = text.toLowerCase();

    // Health / Medical keywords
    if (
      /(doctor|medication|medicine|blood test|prescription|hospital|clinic|appointment|dentist|médico|medicina|medicación|análisis|receta|pastilla|dentista|cita médica|consulta)/i.test(
        lower
      )
    ) {
      return 'health';
    }

    // Finance / Banking keywords
    if (
      /(bank|balance|checking|savings|invoice|bill|payment|salary|account|transfer|dollar|euro|tax|crypto|banco|saldo|factura|pago|salario|cuenta|transferencia|dinero|impuesto)/i.test(
        lower
      )
    ) {
      return 'finances';
    }

    // Shopping / Groceries
    if (
      /(buy|shopping|grocery|groceries|supermarket|purchase|store|cart|comprar|supermercado|tienda|compras|despensa|mercado)/i.test(
        lower
      )
    ) {
      return 'shopping';
    }

    // Documents / Legal / Contracts
    if (
      /(contract|passport|id card|document|pdf|certificate|license|contrato|pasaporte|documento|dni|carnet|certificado|licencia)/i.test(
        lower
      )
    ) {
      return 'documents';
    }

    // Home / Maintenance
    if (
      /(repair|plumber|electrician|cleaning|furniture|roof|garden|hogar|casa|reparación|fontanero|electricista|limpieza|mueble)/i.test(
        lower
      )
    ) {
      return 'home';
    }

    // Projects / Work
    if (
      /(deadline|milestone|deploy|github|release|feature|sprint|proyecto|reunión|entrega|desarrollo)/i.test(
        lower
      )
    ) {
      return 'projects';
    }

    return 'general';
  }

  static detectCardType(
    text: string,
    domain: string,
    registry: SchemaRegistry
  ): LADCardTypeDefinition | undefined {
    const candidates = registry.getCardTypesForCategory(domain);
    if (candidates.length === 0) return undefined;
    if (candidates.length === 1) return candidates[0];

    const lower = text.toLowerCase();
    const hasCurrencyInText = /(?:\$|usd|€|eur|\bdollars?\b|\bdólares\b|\bpesos\b)/i.test(lower);

    // Score candidates based on keyword matches, name matches, and field option matches
    let bestCandidate: LADCardTypeDefinition | undefined = undefined;
    let maxScore = 0;

    for (const ct of candidates) {
      let score = 0;

      // 1. NLP Keywords match
      if (ct.nlp?.keywords) {
        for (const kw of ct.nlp.keywords) {
          const regex = new RegExp(`\\b${kw}\\b`, 'i');
          if (regex.test(lower)) {
            score += 2;
          }
        }
      }

      // 2. Card Type Name match
      if (ct.name) {
        const nameRegex = new RegExp(`\\b${ct.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (nameRegex.test(lower)) {
          score += 3;
        }
      }

      // 3. Select field options matching
      if (ct.fields) {
        for (const field of ct.fields) {
          if (field.type === 'select' && field.options) {
            for (const opt of field.options) {
              const optRegex = new RegExp(`\\b${opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
              if (optRegex.test(lower)) {
                score += 3;
                break;
              }
            }
          }

          // 4. Currency field matching with currency in text
          if (field.type === 'currency' && hasCurrencyInText) {
            score += 2;
          }

          // 5. Field label match
          if (field.label && field.label.length > 2) {
            const labelRegex = new RegExp(`\\b${field.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (labelRegex.test(lower)) {
              score += 1;
            }
          }
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestCandidate = ct;
      }
    }

    return bestCandidate || candidates[0];
  }

  /**
   * Slot fills fields defined on the detected card type
   */
  private static slotFillFields(
    raw: string,
    cardType: LADCardTypeDefinition | undefined,
    refDate: Date,
    detectedAssignee?: string
  ): Record<string, any> {
    const values: Record<string, any> = {};
    if (!cardType) return values;

    const lower = raw.toLowerCase();

    switch (cardType.id) {
      case 'finances.account_balance': {
        // 1. Bank name detection
        // Priority 1: Explicit "Bank <X>", "<X> Bank", or "Banco <X>"
        const explicitBankMatch = raw.match(/\b(Bank\s+[A-Za-z0-9]+|[A-Za-z0-9]+\s+Bank|Banco\s+[A-Za-z0-9]+)\b/i);
        if (explicitBankMatch) {
          values.bank = explicitBankMatch[1];
        } else {
          // Priority 2: Named word immediately before checking/savings
          const beforeTypeMatch = raw.match(/\b([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)\s+(?:checking|savings|corriente|ahorros)\b/i);
          if (beforeTypeMatch && !/^(new|my|the|el|la|mi)$/i.test(beforeTypeMatch[1].trim())) {
            values.bank = beforeTypeMatch[1].trim();
          } else {
            const fallbackMatch = raw.match(/\b([A-Za-z0-9]+)\s+account\b/i);
            if (fallbackMatch && !/(checking|savings|new|my|the)/i.test(fallbackMatch[1])) {
              values.bank = fallbackMatch[1].trim();
            }
          }
        }

        // 2. Account type
        if (/(checking|corriente)/i.test(lower)) {
          values.account_type = 'checking';
        } else if (/(savings|ahorros)/i.test(lower)) {
          values.account_type = 'savings';
        } else if (/(credit|crédito|tarjeta)/i.test(lower)) {
          values.account_type = 'credit';
        } else if (/(investment|inversión)/i.test(lower)) {
          values.account_type = 'investment';
        } else {
          values.account_type = 'checking';
        }

        // 3. Balance detection
        // Matches "$19", "$1,250.50", "balance is $19", "new balance is $19", "saldo $19"
        const balanceMatch =
          raw.match(/(?:\$|usd|€|eur)\s*([\d,]+(?:\.\d+)?)/i) ||
          raw.match(/(?:balance|saldo)(?:\s+(?:is|es|de|new balance is))?\s*\$?([\d,]+(?:\.\d+)?)/i) ||
          raw.match(/(?:is|es)\s*\$?([\d,]+(?:\.\d+)?)/i);

        if (balanceMatch) {
          const numStr = (balanceMatch[1] || '').replace(/,/g, '');
          const val = parseFloat(numStr);
          if (!isNaN(val)) {
            values.balance = val;
          }
        }
        break;
      }

      case 'shopping.groceries_buying': {
        // 1. Checklist extraction: "buy milk, bread, eggs" or "comprar leche, pan, huevos"
        const itemsMatch =
          raw.match(/(?:buy|buying|shopping for|comprar|lista de compras|supermercado:?)\s+(.+?)(?:(?:\s+budget|\s+due|\s+para|\s+presupuesto)|$)/i);

        if (itemsMatch) {
          const rawItems = itemsMatch[1];
          const itemsList = rawItems
            .split(/[,;\n]|(?:\band\b|\by\b)/i)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !/^(budget|due|date|para)/i.test(s));

          if (itemsList.length > 0) {
            values.checklist = itemsList.map((item, idx) => ({
              id: `item_${Date.now()}_${idx}`,
              text: item,
              completed: false,
            }));
          }
        }

        // 2. Budget extraction: "budget $50", "presupuesto $50"
        const budgetMatch = raw.match(/(?:budget|presupuesto)(?:\s+(?:is|es|de))?\s*\$?([\d,]+(?:\.\d+)?)/i);
        if (budgetMatch) {
          const val = parseFloat(budgetMatch[1].replace(/,/g, ''));
          if (!isNaN(val)) {
            values.estimated_budget = val;
          }
        }

        // 3. Target date
        const targetDate = this.detectDueDate(raw, refDate);
        if (targetDate) {
          values.due_date = targetDate;
        }
        break;
      }

      case 'health.medical_appointment': {
        // 1. Specialty detection
        const specialtyMap: Record<string, string> = {
          dentist: 'Dentistry',
          dentista: 'Dentistry',
          dental: 'Dentistry',
          cardio: 'Cardiology',
          cardiólogo: 'Cardiology',
          cardiologist: 'Cardiology',
          derma: 'Dermatology',
          dermatologist: 'Dermatology',
          dermatólogo: 'Dermatology',
          pediatra: 'Pediatrics',
          pediatrician: 'Pediatrics',
          ophthalmologist: 'Ophthalmology',
          oftalmólogo: 'Ophthalmology',
          eye: 'Ophthalmology',
          general: 'General Medicine',
          médico: 'General Medicine',
          doctor: 'General Medicine',
        };

        for (const [key, spec] of Object.entries(specialtyMap)) {
          if (new RegExp(`\\b${key}\\b`, 'i').test(lower)) {
            values.specialty = spec;
            break;
          }
        }
        if (!values.specialty) values.specialty = 'General Medicine';

        // 2. Patient detection
        values.patient = detectedAssignee || 'Me';

        // 3. Appointment date (defaults to today unless specified)
        const dateMatch = this.detectDueDate(raw, refDate);
        values.date = dateMatch || refDate.toISOString().split('T')[0];

        // 4. Outcome extraction: "result is...", "outcome: ...", "doctor said..."
        const outcomeMatch =
          raw.match(/(?:outcome|result|doctor said|indication|indicaciones|receta|diagnóstico|diagnostico):?\s*([^,.;]+)/i);
        if (outcomeMatch) {
          values.outcome = outcomeMatch[1].trim();
        }

        // 5. Follow-up detection: "needs follow up in 2 weeks", "follow up in X days", "control en 2 semanas"
        const hasFollowup = /(follow[- ]?up|control|seguimiento|revisión|revision)/i.test(lower);
        if (hasFollowup) {
          values.needs_followup = true;
          const followupDate = this.detectDueDate(raw, refDate);
          if (followupDate) {
            values.followup_date = followupDate;
          }
          const reasonMatch = raw.match(/(?:follow[- ]?up|control|seguimiento)\s+(?:for|para|because|por)?\s*([^,.;]+)/i);
          if (reasonMatch) {
            values.followup_reason = reasonMatch[1].trim();
          }
        } else {
          values.needs_followup = false;
        }
        break;
      }

      default: {
        // General slot filling
        break;
      }
    }

    // Dynamic slot filling for all schema fields defined on the card type
    if (cardType?.fields) {
      for (const field of cardType.fields) {
        // 1. Select field options (including multi-word phrases with spaces)
        if (field.type === 'select' && field.options && !values[field.key]) {
          const sortedOptions = [...field.options].sort((a, b) => b.length - a.length);
          for (const opt of sortedOptions) {
            const escaped = opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const optRegex = new RegExp(`\\b${escaped}\\b`, 'i');
            if (optRegex.test(raw)) {
              values[field.key] = opt;
              break;
            }
          }
        }

        // 2. Currency field extraction: matches "$50", "50 dollars", "50 usd", "cost is $50", etc.
        if (field.type === 'currency' && values[field.key] === undefined) {
          const currencyMatch =
            raw.match(/(?:\$|usd|€|eur)\s*([\d,]+(?:\.\d+)?)/i) ||
            raw.match(/([\d,]+(?:\.\d+)?)\s*(?:dollars?|dólares|usd|€|eur)/i) ||
            raw.match(/(?:amount|cost|price|balance|budget|fee|total|pago|monto|precio|saldo)(?:\s+(?:is|es|de|of))?\s*\$?([\d,]+(?:\.\d+)?)/i);
          if (currencyMatch) {
            const numStr = (currencyMatch[1] || '').replace(/,/g, '');
            const val = parseFloat(numStr);
            if (!isNaN(val)) {
              values[field.key] = val;
            }
          }
        }

        // 3. Number field extraction
        if (field.type === 'number' && values[field.key] === undefined) {
          const numMatch = raw.match(/\b\d+(?:\.\d+)?\b/);
          if (numMatch) {
            const val = parseFloat(numMatch[0]);
            if (!isNaN(val)) {
              values[field.key] = val;
            }
          }
        }

        // 4. Date field extraction
        if (field.type === 'date' && values[field.key] === undefined) {
          const dateVal = this.detectDueDate(raw, refDate);
          if (dateVal) {
            values[field.key] = dateVal;
          }
        }

        // 5. Person field extraction
        if (field.type === 'person' && values[field.key] === undefined && detectedAssignee) {
          values[field.key] = detectedAssignee;
        }
      }
    }

    return values;
  }

  static detectPriority(text: string): LADObjectPriority {
    const lower = text.toLowerCase();
    if (/(urgent|asap|emergency|urgente|emergencia|inmediatamente|critico|critical)/i.test(lower)) {
      return 'urgent';
    }
    if (/(important|priority|high|importante|alta prioridad|prioridad)/i.test(lower)) {
      return 'high';
    }
    if (/(low priority|maybe|someday|baja prioridad|algún día|cuando pueda)/i.test(lower)) {
      return 'low';
    }
    return 'medium';
  }

  static detectDueDate(text: string, refDate: Date): string | undefined {
    const lower = text.toLowerCase();

    // "in X weeks" / "en X semanas"
    const weeksMatch =
      lower.match(/(?:in|en)\s+(\d+|two|three|four|dos|tres|cuatro)\s+weeks?/i) ||
      lower.match(/(?:en)\s+(\d+|dos|tres|cuatro)\s+semanas?/i);
    if (weeksMatch) {
      let numWeeks = 1;
      const val = weeksMatch[1].toLowerCase();
      if (val === 'two' || val === 'dos') numWeeks = 2;
      else if (val === 'three' || val === 'tres') numWeeks = 3;
      else if (val === 'four' || val === 'cuatro') numWeeks = 4;
      else numWeeks = parseInt(val, 10) || 1;

      const target = new Date(refDate);
      target.setDate(target.getDate() + numWeeks * 7);
      return target.toISOString().split('T')[0];
    }

    // "in X days" / "en X días"
    const daysMatch =
      lower.match(/(?:in|en)\s+(\d+|one|two|three|uno|dos|tres)\s+days?/i) ||
      lower.match(/(?:en)\s+(\d+|uno|dos|tres)\s+d[ií]as?/i);
    if (daysMatch) {
      let numDays = 1;
      const val = daysMatch[1].toLowerCase();
      if (val === 'one' || val === 'uno') numDays = 1;
      else if (val === 'two' || val === 'dos') numDays = 2;
      else if (val === 'three' || val === 'tres') numDays = 3;
      else numDays = parseInt(val, 10) || 1;

      const target = new Date(refDate);
      target.setDate(target.getDate() + numDays);
      return target.toISOString().split('T')[0];
    }

    // "tomorrow" / "mañana"
    if (/(tomorrow|mañana)/i.test(lower)) {
      const target = new Date(refDate);
      target.setDate(target.getDate() + 1);
      return target.toISOString().split('T')[0];
    }

    // "today" / "hoy"
    if (/(today|hoy)/i.test(lower)) {
      return refDate.toISOString().split('T')[0];
    }

    // Date formats (YYYY-MM-DD or DD/MM/YYYY)
    const isoDateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
      return isoDateMatch[1];
    }

    return undefined;
  }

  static detectAssignedPerson(text: string): string | undefined {
    const lower = text.toLowerCase();

    // Family roles or names
    const roleMatches = [
      { pattern: /(?:dad|papá|padre)/i, label: 'Dad' },
      { pattern: /(?:mom|mamá|madre)/i, label: 'Mom' },
      { pattern: /(?:sister|hermana)/i, label: 'Sister' },
      { pattern: /(?:brother|hermano)/i, label: 'Brother' },
      { pattern: /(?:partner|pareja)/i, label: 'Partner' },
    ];

    for (const rm of roleMatches) {
      if (rm.pattern.test(lower)) {
        return rm.label;
      }
    }

    // Named assignments like "needs to schedule", "assigned to John", "para Carlos", "for Carlos"
    const assignedMatch =
      text.match(/(?:assigned to|for|para|needs to|debe)\s+([A-Z][a-z]+)/) ||
      text.match(/@([A-Za-z0-9_]+)/);
    if (assignedMatch) {
      return assignedMatch[1];
    }

    return undefined;
  }

  static detectTags(text: string, domain: string): string[] {
    const tags = new Set<string>();
    tags.add(domain);

    // Hashtags
    const hashMatches = text.match(/#(\w+)/g);
    if (hashMatches) {
      for (const h of hashMatches) {
        tags.add(h.substring(1).toLowerCase());
      }
    }

    const lower = text.toLowerCase();
    if (lower.includes('medication') || lower.includes('medicación')) tags.add('medication');
    if (lower.includes('blood test') || lower.includes('análisis')) tags.add('lab-test');
    if (lower.includes('follow-up') || lower.includes('seguimiento') || lower.includes('follow up'))
      tags.add('follow-up');
    if (lower.includes('bill') || lower.includes('factura')) tags.add('bill');

    return Array.from(tags);
  }

  static extractActionItems(text: string): string[] {
    const actions: string[] = [];
    const clauses = text.split(/[,.;]/).map((c) => c.trim()).filter((c) => c.length > 0);

    for (const clause of clauses) {
      if (
        /(needs to|schedule|call|pay|send|buy|book|test|programar|llamar|pagar|enviar|comprar|reservar|análisis|continuar)/i.test(
          clause
        )
      ) {
        actions.push(clause);
      }
    }

    return actions.length > 0 ? actions : [text];
  }

  static extractEntities(text: string): Array<{ name: string; type: string }> {
    const entities: Array<{ name: string; type: string }> = [];

    if (/(doctor|médico)/i.test(text)) {
      entities.push({ name: 'Doctor', type: 'person' });
    }
    if (/(dad|papá)/i.test(text)) {
      entities.push({ name: 'Dad', type: 'person' });
    }
    if (/(mom|mamá)/i.test(text)) {
      entities.push({ name: 'Mom', type: 'person' });
    }
    if (/(blood test|análisis)/i.test(text)) {
      entities.push({ name: 'Blood Test', type: 'procedure' });
    }
    if (/(medication|medicación)/i.test(text)) {
      entities.push({ name: 'Medication', type: 'treatment' });
    }

    return entities;
  }

  static generateTitle(
    text: string,
    actions: string[],
    cardType?: LADCardTypeDefinition,
    fields?: Record<string, any>
  ): string {
    // 1. Configurable title behavior takes precedence if configured on the card type
    if (cardType?.titleConfig) {
      const { mode, fixedTitle, template } = cardType.titleConfig;
      if (mode === 'fixed') {
        return fixedTitle?.trim() || cardType.name;
      }
      if (mode === 'input_text') {
        return text.trim();
      }
      if (mode === 'template' && template) {
        let interpolated = template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
          const val = fields?.[key];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
          return '';
        });
        interpolated = interpolated.replace(/\s+/g, ' ').replace(/\(\s*\)/g, '').trim();
        if (interpolated.length > 0) {
          return interpolated;
        }
        return cardType.name;
      }
    }

    // Schema-tailored smart titles
    if (cardType?.id === 'finances.account_balance' && fields?.bank) {
      const typeLabel = fields.account_type ? ` ${fields.account_type}` : '';
      return `${fields.bank}${typeLabel} Balance`;
    }

    if (cardType?.id === 'shopping.groceries_buying' && fields?.title) {
      return fields.title;
    }

    if (cardType?.id === 'health.medical_appointment' && fields?.specialty) {
      const patientSuffix = fields.patient && fields.patient !== 'Me' ? ` (${fields.patient})` : '';
      return `${fields.specialty} Appointment${patientSuffix}`;
    }

    // If explicit title field is populated
    if (fields?.title) {
      return fields.title;
    }

    // If custom card type without title field has select and/or currency values
    if (cardType && !cardType.isDefault && fields) {
      const selectField = cardType.fields.find((f) => f.type === 'select');
      const selectVal = selectField ? fields[selectField.key] : undefined;
      const currencyField = cardType.fields.find((f) => f.type === 'currency');
      const currencyVal = currencyField ? fields[currencyField.key] : undefined;

      if (selectVal && currencyVal !== undefined) {
        return `${cardType.name}: ${selectVal} ($${Number(currencyVal).toLocaleString('en-US')})`;
      } else if (selectVal) {
        return `${cardType.name}: ${selectVal}`;
      } else if (currencyVal !== undefined) {
        return `${cardType.name} ($${Number(currencyVal).toLocaleString('en-US')})`;
      }
    }

    // If the text is short enough, use it
    if (text.length <= 60) return text;

    // If we have distinct action items, summarize the first action
    if (actions.length > 0 && actions[0].length <= 60) {
      return actions[0];
    }

    // Otherwise truncate gracefully at word boundary
    const truncated = text.substring(0, 57);
    const lastSpace = truncated.lastIndexOf(' ');
    return `${truncated.substring(0, lastSpace > 0 ? lastSpace : 57)}...`;
  }
}
