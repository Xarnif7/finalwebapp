-- Create feedback cases table for escalated reviews
CREATE TABLE IF NOT EXISTS public.feedback_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    
    -- Source review information
    review_id UUID REFERENCES public.reviews(id) ON DELETE SET NULL,
    
    -- Case information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    
    -- Customer information
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Resolution
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Tags and classification
    tags TEXT[],
    category VARCHAR(100),
    
    -- Communication tracking
    last_contact_at TIMESTAMP WITH TIME ZONE,
    contact_count INTEGER DEFAULT 0,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    follow_up_notes TEXT,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_feedback_cases_business_id ON public.feedback_cases(business_id);
CREATE INDEX idx_feedback_cases_review_id ON public.feedback_cases(review_id);
CREATE INDEX idx_feedback_cases_status ON public.feedback_cases(status);
CREATE INDEX idx_feedback_cases_assigned_to ON public.feedback_cases(assigned_to);
CREATE INDEX idx_feedback_cases_priority ON public.feedback_cases(priority);
CREATE INDEX idx_feedback_cases_follow_up_date ON public.feedback_cases(follow_up_date);
CREATE INDEX idx_feedback_cases_created_at ON public.feedback_cases(created_at DESC);

-- Enable RLS
ALTER TABLE public.feedback_cases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own business feedback cases" ON public.feedback_cases
    FOR ALL USING (
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE created_by = auth.uid()
        )
    );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_feedback_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feedback_cases_updated_at 
    BEFORE UPDATE ON public.feedback_cases 
    FOR EACH ROW EXECUTE FUNCTION update_feedback_cases_updated_at();

-- Create function to auto-create feedback case from escalated review
CREATE OR REPLACE FUNCTION create_feedback_case_from_review()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create feedback case if review is being escalated
    IF NEW.is_private_feedback = TRUE AND (OLD.is_private_feedback = FALSE OR OLD.is_private_feedback IS NULL) THEN
        INSERT INTO public.feedback_cases (
            business_id,
            review_id,
            title,
            description,
            priority,
            status,
            customer_name,
            customer_email,
            customer_phone,
            tags,
            category,
            created_by
        ) VALUES (
            NEW.business_id,
            NEW.id,
            CASE 
                WHEN NEW.rating <= 2 THEN 'Critical Issue - ' || NEW.reviewer_name
                WHEN NEW.rating = 3 THEN 'Service Concern - ' || NEW.reviewer_name
                ELSE 'Review Escalation - ' || NEW.reviewer_name
            END,
            'Escalated from ' || NEW.platform || ' review: "' || LEFT(NEW.review_text, 200) || '"',
            CASE 
                WHEN NEW.rating <= 2 THEN 'urgent'
                WHEN NEW.rating = 3 THEN 'high'
                ELSE 'medium'
            END,
            'open',
            NEW.reviewer_name,
            NEW.reviewer_email,
            NEW.reviewer_phone,
            NEW.tags || ARRAY[NEW.platform, 'escalated-review'],
            'review-escalation',
            auth.uid()
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_feedback_case_on_escalation
    AFTER UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION create_feedback_case_from_review();
